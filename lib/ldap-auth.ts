import ldap from "ldapjs"

const LDAP_URL = "ldap://10.1.6.190" // เปลี่ยนเป็นของจริง
const BASE_DN = "DC=ube,DC=co,DC=th"   // เปลี่ยนเป็นของจริง

export async function ldapAuthorize(username: string, password: string) {
  const client = ldap.createClient({ url: LDAP_URL })
  // รองรับ uid, sAMAccountName, userPrincipalName, cn, mail
  const filter = `(|(uid=${username})(sAMAccountName=${username})(userPrincipalName=${username}@ube.co.th)(cn=${username})(mail=${username}@ube.co.th))`

  try {
    // 1. bind ด้วย user principal (เช่น username@domain.com หรือ DN)
    // ตัวอย่าง: สำหรับ AD ใช้ `${username}@yourdomain.com`
    // สำหรับ OpenLDAP อาจต้องใช้ DN เต็ม
    await new Promise((resolve, reject) => {
      client.bind(`${username}@ube.co.th`, password, (err) => {
        if (err) reject(err)
        else resolve(true)
      })
    })

    // 2. ค้นหาข้อมูล user (handle referral error)
    const user = await new Promise<any>((resolve, reject) => {
      client.search(BASE_DN, { filter, scope: "sub" }, (err, res) => {
        if (err) reject(err)
        let userData = {}
        res.on("searchEntry", (entry) => {
          userData = (entry as any).object
          console.log('DEBUG: LDAP userData', userData)
        })
        res.on("error", (err) => {
          if (err && err.name === 'ReferralError') resolve({})
          else reject(err)
        })
        res.on("end", () => resolve(userData))
      })
    })

    client.unbind()
    // 3. return user object (ถ้าไม่เจอ user ให้ return null)
    if (!user || Object.keys(user).length === 0) {
      console.log('DEBUG: LDAP not found or empty user', user)
      return null
    }
    return {
      id: user.uid || user.sAMAccountName || user.cn,
      name: user.cn,
      email: user.mail,
      department: user.department || user.departmentNumber,
      ...user
    }
  } catch (e) {
    console.log('DEBUG: LDAP error', e)
    client.unbind()
    return null
  }
} 