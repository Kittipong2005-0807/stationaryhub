import ldap from "ldapjs"

const LDAP_URL = "ldap://your-ldap-server" // เปลี่ยนเป็นของจริง
const BASE_DN = "dc=yourdomain,dc=com"    // เปลี่ยนเป็นของจริง

export async function ldapAuthorize(username: string, password: string) {
  const client = ldap.createClient({ url: LDAP_URL })
  // ปรับ filter ตาม LDAP/AD ของคุณ เช่น (sAMAccountName=username) หรือ (uid=username)
  const filter = `(uid=${username})` // หรือ (sAMAccountName=${username}) สำหรับ AD

  try {
    // 1. bind ด้วย user principal (เช่น username@domain.com หรือ DN)
    // ตัวอย่าง: สำหรับ AD ใช้ `${username}@yourdomain.com`
    // สำหรับ OpenLDAP อาจต้องใช้ DN เต็ม
    await new Promise((resolve, reject) => {
      client.bind(`${username}@yourdomain.com`, password, (err) => {
        if (err) reject(err)
        else resolve(true)
      })
    })

    // 2. ค้นหาข้อมูล user
    const user = await new Promise<any>((resolve, reject) => {
      client.search(BASE_DN, { filter, scope: "sub" }, (err, res) => {
        if (err) reject(err)
        let userData = {}
        res.on("searchEntry", (entry) => {
          userData = (entry as any).object
        })
        res.on("end", () => resolve(userData))
      })
    })

    client.unbind()
    // 3. return user object
    return {
      id: user.uid || user.sAMAccountName || user.cn,
      name: user.cn,
      email: user.mail,
      department: user.department || user.departmentNumber,
      ...user
    }
  } catch (e) {
    client.unbind()
    return null
  }
} 