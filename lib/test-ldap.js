import CredentialsProvider from 'next-auth/providers/credentials';
import { AuthOptions } from 'next-auth';
import { prisma } from '@/lib/prisma'
import ldap from 'ldapjs';


export const authOptions = {
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
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          console.error('❌ Missing credentials')
          return null
        }

        const client = ldap.createClient({
          url: process.env.LDAP_URI,
        })

        return new Promise((resolve) => {
          client.bind(
            `${credentials.username}@ube.co.th`,
            credentials.password,
            (error) => {
              if (error) {
                console.error('❌ LDAP bind error:', error.message)
                resolve(null)
                return
              }

              console.log('✅ LDAP bind success')

              client.search(
                'DC=ube,DC=co,DC=th',
                {
                  filter: `(samaccountname=${credentials.username})`,
                  scope: 'sub',
                },
                (err, res) => {
                  if (err) {
                    console.error('❌ LDAP search error:', err.message)
                    resolve(null)
                    return
                  }

                  let userFound = false
                  res.on('searchEntry', (entry) => {
                    userFound = true

                    const userData = {
                      id: credentials.username,
                      name: credentials.username,
                      email: `${credentials.username}@ube.co.th`,
                    }

                    console.log('🔐 Authorized user from LDAP:', userData)
                    resolve(userData)
                  })

                  res.on('error', (err) => {
                    console.error('❌ searchEntry error:', err.message)
                    resolve(null)
                  })

                  res.on('end', () => {
                    if (!userFound) {
                      console.warn('⚠️ No LDAP entry found')
                      resolve(null)
                    }
                  })
                }
              )
            }
          )
        })
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
  debug: true,

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        console.log('🪙 JWT callback - user:', user)
        token.name = user.name
        token.email = user.email

        try {
          const getUserData = await prisma.userWithRoles.findFirst({
            where: {
              AdLoginName: user.name || ' ',
              CurrentEmail: user.email || '',
            },
          })

          console.log('📦 Prisma userWithRoles:', getUserData)

          token.AdLoginName = getUserData?.AdLoginName
          token.EmpCode = getUserData?.EmpCode
          token.FullNameEng = getUserData?.FullNameEng
          token.FullNameThai = getUserData?.FullNameThai
          token.PostNameEng = getUserData?.PostNameEng
          token.CostCenterEng = getUserData?.CostCenterEng
        } catch (error) {
          console.error('❌ Error querying Prisma:', error)
        }
      }

      return token
    },

    async session({ session, token }) {
      const fullSession = {
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
        },
      }

      console.log('📤 Session callback - returning to client:', fullSession)
      return fullSession
    },
  },
}
