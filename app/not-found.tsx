export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">ไม่พบหน้าที่คุณกำลังมองหา</h2>
        <p className="text-gray-600 mb-8">หน้าที่คุณกำลังมองหาอาจถูกลบ ย้าย หรือไม่มีอยู่</p>
        <a 
          href="/stationaryhub" 
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
        >
          กลับสู่หน้าหลัก
        </a>
      </div>
    </div>
  );
}
