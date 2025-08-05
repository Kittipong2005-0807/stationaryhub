
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
                  },
                  (error, res) => {
                    if (error) {
                      console.log('❌ LDAP search error:', error.message);
                      reject(new Error(error?.message || String(error)));
                    }

                    res.on('searchEntry', (entry: LdapEntry) => {
                      console.log('🎯 LDAP search entry found:', entry.object);
                      resolve({
                        id: credentials.username,
                        name: credentials.username,
                        email: `${credentials.username}@ube.co.th`,
                      });
                    });

                    res.on('error', (err) => {
                      console.log('❌ LDAP searchEntry error:', err.message);
                      reject(new Error(err.message));
                    });

                    res.on('end', (result: { status?: number }) => {
                      if (result.status !== 0) {
                        console.log('⚠️ LDAP search end with status:', result.status);
                        reject(new Error('LDAP search ended with non-zero status'));
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

        const getUserData = await prisma.$queryRaw`
          SELECT * FROM userWithRoles 
          WHERE AdLoginName = ${user.name || ''} 
          AND CurrentEmail = ${user.email || ''}
        `;

        // console.log('🧠 Fetched user from DB (userWithRoles):', getUserData);

        const userData = Array.isArray(getUserData) ? getUserData[0] : getUserData;
        token.AdLoginName = userData?.AdLoginName;
        token.EmpCode = userData?.EmpCode;
        token.FullNameEng = userData?.FullNameEng;
        token.FullNameThai = userData?.FullNameThai;
        token.PostNameEng = userData?.PostNameEng;
        token.CostCenterEng = userData?.CostCenterEng;
        token.orgcode3 = userData?.orgcode3;
        
        // กำหนด Role จากฐานข้อมูล USERS
        let userRole = 'USER'; // default role
        
        try {
          // ดึงข้อมูล Role จากตาราง USERS โดยตรง
          const userFromDB = await prisma.$queryRaw`
            SELECT ROLE FROM USERS WHERE USER_ID = ${user.name || ''}
          `;
          
          if (userFromDB && Array.isArray(userFromDB) && userFromDB.length > 0) {
            userRole = userFromDB[0].ROLE || 'USER';
          } else {
            // ถ้าไม่พบในฐานข้อมูล ให้ใช้เงื่อนไขพิเศษ
            if (user.name === '9C154') {
              userRole = 'DEV';
            } else if (user.email === 'mujg-hkwfhm6dsohksojvp@ube.co.th') {
              userRole = 'ADMIN';
            }
          }
        } catch (error) {
          console.log('Error fetching user role from DB:', error);
          // fallback to hardcoded roles
          if (user.name === '9C154') {
            userRole = 'DEV';
          } else if (user.email === 'mujg-hkwfhm6dsohksojvp@ube.co.th') {
            userRole = 'ADMIN';
          }
        }
        
        token.Role = userRole;
      }

      return token;
    },
    session: ({ session, token }) => {
      const sessionWithUser = {
        ...session,
        user: {
          ...session.user,
          AdLoginName: token.AdLoginName,
          EmpCode: token.EmpCode,
          CurrentEmail: token.email,
          FullNameEng: token.FullNameEng,
          FullNameThai: token.FullNameThai,
          PostNameEng: token.PostNameEng,
          CostCenterEng: token.CostCenterEng,
          ROLE: token.Role,
          orgcode3: token.orgcode3
        },
      };

    //   console.log('📦 Session object being returned to client:', sessionWithUser);

      return sessionWithUser;
    },
  },
};
