import CredentialsProvider from 'next-auth/providers/credentials';
import { AuthOptions } from 'next-auth';
import { prisma } from '@/lib/prisma';
import ldap from 'ldapjs';
import { getBasePathUrl } from '@/lib/base-path';

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
  // NextAuth configuration
  pages: {
    signIn: '/login'
  },

  // Session configuration
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },

  // JWT configuration
  jwt: {
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },

  providers: [
    CredentialsProvider({
      name: 'LDAP',
      credentials: {
        username: {
          label: 'ชื่อผู้ใช้',
          type: 'text',
          placeholder: 'กรุณากรอกชื่อผู้ใช้'
        },
        password: {
          label: 'รหัสผ่าน',
          type: 'password',
          placeholder: 'กรุณากรอกรหัสผ่าน'
        }
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
          url: process.env.LDAP_URI
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
              const department = undefined; // จะดึงจาก userWithRoles view แทน
              const title = 'Employee';

              console.log('📝 Creating user data:', {
                username,
                email,
                department,
                fullName
              });

              // ดึงข้อมูลจาก userWithRoles view และบันทึกข้อมูลในฐานข้อมูล
              let empCode = username; // default to username if not found
              let userFullName = fullName; // default to username

              (async () => {
                try {
                  if (prisma) {
                    // ดึงข้อมูลจาก userWithRoles view เพื่อหา EmpCode, orgcode3 และ role
                    let siteId = null; // default value
                    let userRole = 'USER'; // default role
                    let userDepartment = undefined; // default value

                    try {
                      const userData = await prisma.$queryRaw`
                        SELECT EmpCode, orgcode3, PostNameEng, FullNameEng, CostCenterEng FROM userWithRoles 
                        WHERE AdLoginName = ${username} 
                      `;

                      if (Array.isArray(userData) && userData.length > 0) {
                        if (userData[0].EmpCode) {
                          empCode = userData[0].EmpCode.toString();
                          console.log(
                            '✅ Found EmpCode from userWithRoles:',
                            empCode
                          );
                        }

                        if (userData[0].orgcode3) {
                          siteId = userData[0].orgcode3.toString();
                          console.log(
                            '✅ Found orgcode3 from userWithRoles:',
                            siteId
                          );
                        }

                        if (userData[0].FullNameEng) {
                          userFullName = userData[0].FullNameEng.toString();
                          console.log(
                            '✅ Found FullNameEng from userWithRoles:',
                            userFullName
                          );
                        }

                        if (userData[0].CostCenterEng) {
                          userDepartment = userData[0].CostCenterEng.toString();
                          console.log(
                            '✅ Found CostCenterEng from userWithRoles:',
                            userDepartment
                          );
                        }

                        // กำหนด role ตาม PostNameEng
                        if (userData[0].PostNameEng) {
                          const postName = userData[0].PostNameEng.toString();
                          if (postName.includes('Manager')) {
                            userRole = 'MANAGER';
                          } else {
                            userRole = 'USER';
                          }
                          console.log(
                            '✅ Determined role from PostNameEng:',
                            userRole
                          );
                        }
                      } else {
                        console.log(
                          '⚠️ No user data found in userWithRoles, using defaults'
                        );
                      }
                    } catch (viewError) {
                      console.log(
                        '⚠️ Error querying userWithRoles:',
                        viewError
                      );
                    }

                    // ตรวจสอบว่ามี user ในฐานข้อมูลหรือไม่
                    let existingUser = null;
                    try {
                      existingUser = await prisma.uSERS.findUnique({
                        where: { USER_ID: empCode }
                      });
                    } catch (dbError) {
                      console.log(
                        '⚠️ Database error when finding user:',
                        dbError
                      );
                    }

                    if (existingUser) {
                      // อัปเดตข้อมูลที่มีอยู่ - ปิดการใช้งานชั่วคราว
                      /*
                      try {
                        existingUser = await prisma.uSERS.update({
                          where: { USER_ID: empCode },
                          data: {
                            USERNAME: userFullName,
                            EMAIL: email,
                            DEPARTMENT: department,
                            ROLE: userRole,
                            SITE_ID: siteId
                          }
                        });
                        console.log('✅ Updated existing user in database');
                      } catch (updateError) {
                        console.log('⚠️ Error updating user:', updateError);
                      }
                      */
                      console.log(
                        'ℹ️ Auto-update disabled - using existing user data'
                      );
                    } else {
                      // สร้าง user ใหม่
                      try {
                        existingUser = await prisma.uSERS.create({
                          data: {
                            USER_ID: empCode,
                            USERNAME: userFullName,
                            PASSWORD: 'ldap_authenticated',
                            EMAIL: email,
                            ROLE: userRole,
                            DEPARTMENT: userDepartment,
                            SITE_ID: siteId
                          }
                        });
                        console.log(
                          '✅ Created new user in database with USER_ID:',
                          empCode,
                          'SITE_ID:',
                          siteId,
                          'and ROLE:',
                          userRole
                        );
                      } catch (createError) {
                        console.log('⚠️ Error creating user:', createError);
                      }
                    }

                    if (existingUser) {
                      console.log(
                        '✅ User data saved/updated in USERS table:',
                        {
                          USER_ID: existingUser.USER_ID,
                          USERNAME: existingUser.USERNAME,
                          EMAIL: existingUser.EMAIL,
                          DEPARTMENT: existingUser.DEPARTMENT
                        }
                      );
                    }
                  }
                } catch (dbError) {
                  console.error('❌ Database error:', dbError);
                }

                const userObject = {
                  id: empCode, // ใช้ EmpCode เป็น USER_ID
                  name: username, // ยังคงใช้ username เป็น name สำหรับ session
                  email: email,
                  fullName: userFullName,
                  department: department,
                  title: title
                };

                console.log('✅ Returning user object:', userObject);
                client.unbind();
                resolve(userObject as ExtendedUser);
              })();
            });
          };

          tryNextBind();
        });
      }
    })
  ],
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
            // ใช้ user.id (empCode) แทน user.name (AdLoginName)
            const userFromDB = await prisma.uSERS.findUnique({
              where: { USER_ID: user.id }
            });

            console.log('🔍 User from DB:', userFromDB);

            if (userFromDB) {
              token.USERNAME = userFromDB.USERNAME;
              token.EMAIL = userFromDB.EMAIL;
              token.DEPARTMENT = userFromDB.DEPARTMENT;
              token.ROLE = userFromDB.ROLE; // Use ROLE from USERS table
              token.SITE_ID = userFromDB.SITE_ID;
              token.EmpCode = user.id; // Add EmpCode to token

              console.log('✅ Token populated from USERS table:', {
                USERNAME: token.USERNAME,
                EMAIL: token.EMAIL,
                DEPARTMENT: token.DEPARTMENT,
                ROLE: token.ROLE, // ROLE from USERS table
                EmpCode: token.EmpCode
              });
            } else {
              console.log('⚠️ User not found in USERS table for:', user.id);
              // Fallback values
              token.USERNAME = (user as ExtendedUser).fullName || user.name;
              token.EMAIL = user.email;
              token.DEPARTMENT = undefined; // จะอัปเดตจาก userWithRoles view แทน
              token.ROLE = 'USER'; // Will be updated from userWithRoles view below
              token.SITE_ID = null; // Will be updated from userWithRoles view below
              token.EmpCode = user.id; // Add EmpCode to token
            }

            // Fetch additional data from userWithRoles view
            try {
              const getUserData = await prisma.$queryRaw`
                SELECT * FROM userWithRoles 
                WHERE AdLoginName = ${user.name ?? ''} 
              `;

              console.log('🔍 UserWithRoles data:', getUserData);

              const userData = Array.isArray(getUserData)
                ? getUserData[0]
                : getUserData;
              if (userData) {
                token.AdLoginName = userData.AdLoginName;
                token.EmpCode = userData.EmpCode;
                token.FullNameEng = userData.FullNameEng;
                token.FullNameThai = userData.FullNameThai;
                token.PostNameEng = userData.PostNameEng;
                token.CostCenterEng = userData.CostCenterEng;
                token.orgcode3 = userData.orgcode3;
                
                // Update DEPARTMENT in token from CostCenterEng
                if (userData.CostCenterEng) {
                  token.DEPARTMENT = userData.CostCenterEng.toString();
                  console.log('✅ Updated DEPARTMENT in token from CostCenterEng:', token.DEPARTMENT);
                }

                // Update SITE_ID from orgcode3
                if (userData.orgcode3) {
                  token.SITE_ID = userData.orgcode3.toString();
                  console.log(
                    '✅ Updated SITE_ID from orgcode3:',
                    token.SITE_ID
                  );
                }

                // Update DEPARTMENT in USERS table from CostCenterEng
                if (userData.CostCenterEng) {
                  try {
                    await prisma.$executeRaw`
                      UPDATE USERS 
                      SET DEPARTMENT = ${userData.CostCenterEng.toString()}
                      WHERE USER_ID = ${user.name ?? ''}
                    `;
                    console.log(
                      '✅ Updated DEPARTMENT in USERS table from CostCenterEng:',
                      userData.CostCenterEng
                    );
                  } catch (updateError) {
                    console.error(
                      '❌ Failed to update DEPARTMENT in USERS table:',
                      updateError
                    );
                  }
                }

                // Update ROLE from PostNameEng - temporarily disabled
                /*
                if (userData.PostNameEng) {
                  const postName = userData.PostNameEng.toString();
                  if (postName.includes('Manager')) {
                    token.ROLE = 'MANAGER';
                  } else {
                    token.ROLE = 'USER';
                  }
                  console.log('✅ Updated ROLE from PostNameEng:', token.ROLE);
                }
                */
                console.log(
                  'ℹ️ ROLE update from userWithRoles disabled - using ROLE from USERS table'
                );

                console.log('✅ Token populated from userWithRoles view');
              } else {
                console.log(
                  '⚠️ User not found in userWithRoles view for:',
                  user.name
                );
                // Fallback: use data from user object from authorize
                token.AdLoginName = user.name;
                token.FullNameEng =
                  (user as ExtendedUser).fullName || user.name;
                token.FullNameThai =
                  (user as ExtendedUser).fullName || user.name;
              }
            } catch (error) {
              console.error('❌ Error querying userWithRoles view:', error);
              // Fallback: use data from user object from authorize
              token.AdLoginName = user.name;
              token.FullNameEng = (user as ExtendedUser).fullName || user.name;
              token.FullNameThai = (user as ExtendedUser).fullName || user.name;
            }
          } catch (error) {
            console.error('❌ Error in JWT callback:', error);
            // Fallback values
            token.USERNAME = (user as ExtendedUser).fullName || user.name;
            token.EMAIL = user.email;
            token.DEPARTMENT = undefined; // จะอัปเดตจาก userWithRoles view แทน
            token.ROLE = 'USER'; // default role when error occurs
            token.SITE_ID = null; // Will be updated from userWithRoles view if found
            token.AdLoginName = user.name;
            token.EmpCode = user.id; // Add EmpCode to token
            token.FullNameEng = (user as ExtendedUser).fullName || user.name;
            token.FullNameThai = (user as ExtendedUser).fullName || user.name;
          }
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
          USER_ID: token.EmpCode || token.name, // ใช้ EmpCode เป็น USER_ID
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
        }
      };

      console.log('📦 Session object being returned to client:', {
        USER_ID: sessionWithUser.user.USER_ID,
        USERNAME: sessionWithUser.user.USERNAME,
        EMAIL: sessionWithUser.user.EMAIL,
        DEPARTMENT: sessionWithUser.user.DEPARTMENT,
        ROLE: sessionWithUser.user.ROLE
      });

      return sessionWithUser;
    }
  }
};