
import CredentialsProvider from 'next-auth/providers/credentials';
import { AuthOptions } from 'next-auth';
import { prisma } from '@/lib/prisma';
import ldap from 'ldapjs';

interface LdapEntry {
  object: {
    [key: string]: unknown;
  };
}

interface ExtendedUser {
  id: string;
  name: string;
  email: string;
  fullName?: string;
  department?: string;
  title?: string;
}

export const authOptions: AuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'LDAP',
      credentials: {
        username: {
          label: 'ชื่อผู้ใช้',
          type: 'text',
          placeholder: 'กรุณากรอกชื่อผู้ใช้',
        },
        password: {
          label: 'รหัสผ่าน',
          type: 'password',
          placeholder: 'กรุณากรอกรหัสผ่าน',
        },
      },
      async authorize(credentials?: Record<'username' | 'password', string>) {
        console.log('🔐 Starting LDAP authentication...');
        
        if (!credentials?.username || !credentials?.password) {
          console.log('❌ Missing credentials');
          return null;
        }

        console.log('🔐 Attempting LDAP bind for:', credentials.username);

        // ตรวจสอบ environment variables
        if (!process.env.LDAP_URI) {
          console.log('❌ LDAP_URI not configured');
          return null;
        }

        const client = ldap.createClient({
          url: process.env.LDAP_URI,
        });

        return new Promise((resolve) => {
          // ทดสอบรูปแบบการ bind ต่างๆ
          const bindTests = [
            {
              name: 'userPrincipalName',
              bindString: `${credentials.username}@ube.co.th`
            },
            {
              name: 'Simple username',
              bindString: credentials.username
            },
            {
              name: 'Distinguished Name',
              bindString: `CN=${credentials.username},OU=Users,DC=ube,DC=co,DC=th`
            }
          ];

          let testIndex = 0;

          const tryNextBind = () => {
            if (testIndex >= bindTests.length) {
              console.log('❌ All LDAP bind attempts failed');
              client.unbind();
              resolve(null);
              return;
            }

            const test = bindTests[testIndex];
            console.log(`🔍 Trying ${test.name}: ${test.bindString}`);

            client.bind(test.bindString, credentials.password, (bindError) => {
              if (bindError) {
                console.log(`❌ ${test.name} failed:`, bindError.message);
                testIndex++;
                tryNextBind();
                return;
              }

              console.log(`✅ ${test.name} successful!`);
              
              // LDAP bind สำเร็จ - สร้าง user object
              const username = credentials.username;
              const email = `${username}@ube.co.th`;
              const fullName = username; // ใช้ username เป็นชื่อเริ่มต้น
              const department = 'General';
              const title = 'Employee';

              console.log('📝 Creating user data:', {
                username,
                email,
                department,
                fullName
              });

              // บันทึกข้อมูลในฐานข้อมูล
              setTimeout(async () => {
                try {
                  if (prisma) {
                    // ตรวจสอบว่ามี user ในฐานข้อมูลหรือไม่
                    let existingUser = null;
                    try {
                      existingUser = await prisma.uSERS.findUnique({
                        where: { USER_ID: username }
                      });
                    } catch (dbError) {
                      console.log('⚠️ Database error when finding user:', dbError);
                    }

                    if (existingUser) {
                      // อัปเดตข้อมูลที่มีอยู่
                      try {
                        existingUser = await prisma.uSERS.update({
                          where: { USER_ID: username },
                          data: {
                            USERNAME: fullName,
                            EMAIL: email,
                            DEPARTMENT: department
                          }
                        });
                        console.log('✅ Updated existing user in database');
                      } catch (updateError) {
                        console.log('⚠️ Error updating user:', updateError);
                      }
                    } else {
                      // สร้าง user ใหม่
                      try {
                        existingUser = await prisma.uSERS.create({
                          data: {
                            USER_ID: username,
                            USERNAME: fullName,
                            PASSWORD: 'ldap_authenticated',
                            EMAIL: email,
                            ROLE: 'USER',
                            DEPARTMENT: department,
                            SITE_ID: '1700'
                          }
                        });
                        console.log('✅ Created new user in database');
                      } catch (createError) {
                        console.log('⚠️ Error creating user:', createError);
                      }
                    }

                    if (existingUser) {
                      console.log('✅ User data saved/updated in USERS table:', {
                        USER_ID: existingUser.USER_ID,
                        USERNAME: existingUser.USERNAME,
                        EMAIL: existingUser.EMAIL,
                        DEPARTMENT: existingUser.DEPARTMENT
                      });
                    }
                  }
                } catch (dbError) {
                  console.error('❌ Database error:', dbError);
                }

                const userObject = {
                  id: username,
                  name: username,
                  email: email,
                  fullName: fullName,
                  department: department,
                  title: title
                };

                console.log('✅ Returning user object:', userObject);
                client.unbind();
                resolve(userObject as ExtendedUser);
              }, 500);
            });
          };

          tryNextBind();
        });
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      console.log('🧠 JWT Callback - user:', user);
      console.log('🧠 JWT Callback - token:', token);

      if (user) {
        token.name = user.name;
        token.email = user.email;

        console.log('🧠 JWT Callback: User object from authorize():', user);

        // ตรวจสอบว่า prisma พร้อมใช้งานหรือไม่
        if (prisma) {
          try {
            // ดึงข้อมูลจากตาราง USERS ที่เพิ่งอัปเดต
            const userFromDB = await prisma.uSERS.findUnique({
              where: { USER_ID: user.name }
            });

            console.log('🔍 User from DB:', userFromDB);

            if (userFromDB) {
              token.USERNAME = userFromDB.USERNAME;
              token.EMAIL = userFromDB.EMAIL;
              token.DEPARTMENT = userFromDB.DEPARTMENT;
              token.ROLE = userFromDB.ROLE;
              token.SITE_ID = userFromDB.SITE_ID;
              
              console.log('✅ Token populated from USERS table:', {
                USERNAME: token.USERNAME,
                EMAIL: token.EMAIL,
                DEPARTMENT: token.DEPARTMENT,
                ROLE: token.ROLE
              });
            } else {
              console.log('⚠️ User not found in USERS table for:', user.name);
              // Fallback values
              token.USERNAME = (user as ExtendedUser).fullName || user.name;
              token.EMAIL = user.email;
              token.DEPARTMENT = (user as ExtendedUser).department || 'General';
              token.ROLE = 'USER';
              token.SITE_ID = '1700';
            }

            // ดึงข้อมูลเพิ่มเติมจาก userWithRoles view
            try {
              const getUserData = await prisma.$queryRaw`
                SELECT * FROM userWithRoles 
                WHERE AdLoginName = ${user.name ?? ''} 
              `;

              console.log('🔍 UserWithRoles data:', getUserData);

              const userData = Array.isArray(getUserData) ? getUserData[0] : getUserData;
              if (userData) {
                token.AdLoginName = userData.AdLoginName;
                token.EmpCode = userData.EmpCode;
                token.FullNameEng = userData.FullNameEng;
                token.FullNameThai = userData.FullNameThai;
                token.PostNameEng = userData.PostNameEng;
                token.CostCenterEng = userData.CostCenterEng;
                token.orgcode3 = userData.orgcode3;
                
                console.log('✅ Token populated from userWithRoles view');
              } else {
                console.log('⚠️ User not found in userWithRoles view for:', user.name);
                // Fallback: ใช้ข้อมูลจาก user object ที่ได้จาก authorize
                token.AdLoginName = user.name;
                token.FullNameEng = (user as ExtendedUser).fullName || user.name;
                token.FullNameThai = (user as ExtendedUser).fullName || user.name;
              }
            } catch (error) {
              console.error('❌ Error querying userWithRoles view:', error);
              // Fallback: ใช้ข้อมูลจาก user object ที่ได้จาก authorize
              token.AdLoginName = user.name;
              token.FullNameEng = (user as ExtendedUser).fullName || user.name;
              token.FullNameThai = (user as ExtendedUser).fullName || user.name;
            }
          } catch (error) {
            console.error('❌ Error in JWT callback:', error);
            // Fallback values
            token.USERNAME = (user as ExtendedUser).fullName || user.name;
            token.EMAIL = user.email;
            token.DEPARTMENT = (user as ExtendedUser).department || 'General';
            token.ROLE = 'USER';
            token.SITE_ID = '1700';
            token.AdLoginName = user.name;
            token.FullNameEng = (user as ExtendedUser).fullName || user.name;
            token.FullNameThai = (user as ExtendedUser).fullName || user.name;
          }
        } else {
          console.log('⚠️ Prisma not available in JWT callback, using fallback values');
          // Fallback values when prisma is not available
          token.USERNAME = (user as ExtendedUser).fullName || user.name;
          token.EMAIL = user.email;
          token.DEPARTMENT = (user as ExtendedUser).department || 'General';
          token.ROLE = 'USER';
          token.SITE_ID = '1700';
          token.AdLoginName = user.name;
          token.FullNameEng = (user as ExtendedUser).fullName || user.name;
          token.FullNameThai = (user as ExtendedUser).fullName || user.name;
        }
      }

      console.log('🧠 JWT Callback - final token:', token);
      return token;
    },
    session: ({ session, token }) => {
      console.log('📦 Session Callback - session:', session);
      console.log('📦 Session Callback - token:', token);

      const sessionWithUser = {
        ...session,
        user: {
          ...session.user,
          USER_ID: token.name,
          USERNAME: token.USERNAME,
          EMAIL: token.EMAIL,
          DEPARTMENT: token.DEPARTMENT,
          ROLE: token.ROLE,
          SITE_ID: token.SITE_ID,
          AdLoginName: token.AdLoginName,
          EmpCode: token.EmpCode,
          CurrentEmail: token.email,
          FullNameEng: token.FullNameEng,
          FullNameThai: token.FullNameThai,
          PostNameEng: token.PostNameEng,
          CostCenterEng: token.CostCenterEng,
          orgcode3: token.orgcode3
        },
      };

      console.log('📦 Session object being returned to client:', {
        USER_ID: sessionWithUser.user.USER_ID,
        USERNAME: sessionWithUser.user.USERNAME,
        EMAIL: sessionWithUser.user.EMAIL,
        DEPARTMENT: sessionWithUser.user.DEPARTMENT,
        ROLE: sessionWithUser.user.ROLE
      });

      return sessionWithUser;
    },
  },
};
