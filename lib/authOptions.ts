
import CredentialsProvider from 'next-auth/providers/credentials';
import { AuthOptions } from 'next-auth';
import { prisma } from '@/lib/prisma';
import ldap from 'ldapjs';

interface LdapEntry {
  object: {
    [key: string]: unknown;
  };
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
        const client = ldap.createClient({
          url: process.env.LDAP_URI as string,
        });

        return new Promise((resolve, reject) => {
          if (!credentials?.username || !credentials?.password) {
            console.log('❌ Missing credentials');
            reject(new Error('Missing username or password'));
            return;
          }

          console.log('🔐 Attempting LDAP bind for:', credentials.username);

          client.bind(
            `${credentials.username}@ube.co.th`,
            credentials.password,
            (error) => {
              if (error) {
                console.log('❌ LDAP bind error:', error.message);
                reject(new Error(error?.message || String(error)));
              } else {
                console.log('✅ LDAP bind successful');

                client.search(
                  'DC=ube,DC=co,DC=th',
                  {
                    filter: `(samaccountname=${credentials.username})`,
                    scope: 'sub',
                    attributes: [
                      'samaccountname',
                      'cn',
                      'mail',
                      'department',
                      'departmentNumber',
                      'title',
                      'displayName',
                      'givenName',
                      'sn',
                      'employeeID',
                      'distinguishedName'
                    ]
                  },
                  (error, res) => {
                    if (error) {
                      console.log('❌ LDAP search error:', error.message);
                      reject(new Error(error?.message || String(error)));
                    }

                    let userData: Record<string, unknown> | null = null;

                    res.on('searchEntry', (entry: LdapEntry) => {
                      console.log('🎯 LDAP search entry found:', entry.object);
                      userData = entry.object;
                    });

                    res.on('error', (err) => {
                      console.log('❌ LDAP searchEntry error:', err.message);
                      reject(new Error(err.message));
                    });

                    res.on('end', async (result: { status?: number }) => {
                      if (result.status !== 0) {
                        console.log('⚠️ LDAP search end with status:', result.status);
                        reject(new Error('LDAP search ended with non-zero status'));
                        return;
                      }

                      if (!userData) {
                        console.log('❌ No user data found in LDAP');
                        reject(new Error('User not found in LDAP'));
                        return;
                      }

                      try {
                        // จัดเก็บข้อมูลในตาราง USERS
                        const username = credentials.username;
                        const email = userData.mail || `${username}@ube.co.th`;
                        const department = userData.department || userData.departmentNumber || 'General';
                        const fullName = userData.displayName || userData.cn || username;
                        const title = userData.title || 'Employee';

                        // ตรวจสอบว่ามี user ในฐานข้อมูลหรือไม่
                        let existingUser = await prisma.uSERS.findUnique({
                          where: { USER_ID: username }
                        });

                        if (existingUser) {
                          // อัปเดตข้อมูลที่มีอยู่
                          existingUser = await prisma.uSERS.update({
                            where: { USER_ID: username },
                            data: {
                              USERNAME: fullName,
                              EMAIL: email,
                              DEPARTMENT: department
                            }
                          });
                        } else {
                          // สร้าง user ใหม่
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
                        }

                        console.log('✅ User data saved/updated in USERS table:', {
                          USER_ID: existingUser.USER_ID,
                          USERNAME: existingUser.USERNAME,
                          EMAIL: existingUser.EMAIL,
                          DEPARTMENT: existingUser.DEPARTMENT
                        });

                        resolve({
                          id: username,
                          name: username,
                          email: email,
                          fullName: fullName,
                          department: department,
                          title: title
                        } as any);
                      } catch (dbError) {
                        console.error('❌ Database error:', dbError);
                        reject(new Error('Failed to save user data'));
                      }
                    });
                  }
                );
              }
            }
          );
        });
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.name = user.name;
        token.email = user.email;

        console.log('🧠 JWT Callback: User object from authorize():', user);

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
        }

        // ดึงข้อมูลเพิ่มเติมจาก userWithRoles view
        try {
          const getUserData = await prisma.$queryRaw`
            SELECT * FROM userWithRoles 
            WHERE AdLoginName = ${user.name || ''} 
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
            token.FullNameEng = (user as any).fullName || user.name;
            token.FullNameThai = (user as any).fullName || user.name;
          }
                  } catch (error) {
            console.error('❌ Error querying userWithRoles view:', error);
            // Fallback: ใช้ข้อมูลจาก user object ที่ได้จาก authorize
            token.AdLoginName = user.name;
            token.FullNameEng = (user as any).fullName || user.name;
            token.FullNameThai = (user as any).fullName || user.name;
          }
      }

      return token;
    },
    session: ({ session, token }) => {
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
