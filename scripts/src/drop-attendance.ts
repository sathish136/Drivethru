import { db } from "@workspace/db";
import { attendanceRecords, leaveBalances } from "@workspace/db/schema";

async function dropAttendanceData() {
  console.log("Dropping attendance data...");
  
  try {
    // Delete attendance records
    const deletedRecords = await db.delete(attendanceRecords);
    console.log(`✅ Deleted ${deletedRecords.rowCount} attendance records`);
    
    // Delete leave balances
    const deletedBalances = await db.delete(leaveBalances);
    console.log(`✅ Deleted ${deletedBalances.rowCount} leave balance records`);
    
    console.log("✅ Attendance data dropped successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error dropping attendance data:", error);
    process.exit(1);
  }
}

dropAttendanceData();
