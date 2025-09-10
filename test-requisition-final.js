// Test script สำหรับทดสอบการสร้าง requisition หลังจากแก้ไขปัญหา requisitionId
const testRequisition = async () => {
  try {
    console.log("🧪 Testing requisition creation after requisitionId fix...")
    
    const testData = {
      action: "createRequisition",
      userId: "9C154",
      totalAmount: 100,
      issueNote: "Test requisition after requisitionId fix",
      siteId: "1700",
      REQUISITION_ITEMS: [
        {
          PRODUCT_ID: 1,
          QUANTITY: 2,
          UNIT_PRICE: 50,
          TOTAL_PRICE: 100
        }
      ]
    }
    
    console.log("📤 Sending test data:", testData)
    
    const response = await fetch("http://localhost:3000/stationaryhub/api/orgcode3", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(testData)
    })
    
    console.log("📥 Response status:", response.status)
    
    if (response.ok) {
      const result = await response.json()
      console.log("✅ Success:", result)
      console.log("✅ Requisition ID:", result.requisitionId)
    } else {
      const error = await response.json()
      console.error("❌ Error:", error)
      console.error("❌ Error details:", error.details)
    }
    
  } catch (error) {
    console.error("💥 Test failed:", error)
  }
}

// รัน test
testRequisition()







