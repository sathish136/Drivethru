import { db } from "@workspace/db";
import { attendanceRecords, employees } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

// Raw attendance data for employee HR-EMP-00018 (Madiha)
const rawData = [
  // February 2026
  "02/02/2026 09:44:13AM", "02/02/2026 01:22:00PM", "02/02/2026 02:17:45PM", "02/02/2026 05:25:50PM",
  "03/02/2026 09:14:56AM", "03/02/2026 01:38:18PM", "03/02/2026 02:10:25PM", "03/02/2026 05:36:16PM",
  "04/02/2026 08:34:59AM", "04/02/2026 02:15:01PM", "04/02/2026 02:40:47PM", "04/02/2026 05:07:11PM",
  "05/02/2026 08:50:58AM", "05/02/2026 01:23:24PM", "05/02/2026 02:31:27PM", "05/02/2026 05:19:29PM",
  "06/02/2026 08:53:34AM", "06/02/2026 02:04:04PM", "06/02/2026 02:47:30PM", "06/02/2026 05:17:46PM",
  "07/02/2026 08:24:42AM", "07/02/2026 01:48:25PM", "09/02/2026 08:53:51AM", "09/02/2026 01:54:39PM",
  "09/02/2026 02:18:16PM", "09/02/2026 05:33:55PM", "11/02/2026 08:32:42AM", "11/02/2026 02:12:01PM",
  "11/02/2026 03:11:42PM", "11/02/2026 05:22:45PM", "12/02/2026 08:50:07AM", "12/02/2026 01:53:58PM",
  "12/02/2026 02:30:16PM", "12/02/2026 05:07:16PM", "13/02/2026 08:35:29AM", "13/02/2026 01:33:51PM",
  "13/02/2026 02:12:53PM", "13/02/2026 05:24:40PM", "16/02/2026 08:27:42AM", "16/02/2026 01:57:21PM",
  "16/02/2026 02:41:03PM", "16/02/2026 05:15:39PM", "17/02/2026 11:50:08AM", "17/02/2026 05:10:28PM",
  "18/02/2026 08:26:47AM", "18/02/2026 01:48:08PM", "18/02/2026 02:15:56PM", "18/02/2026 05:09:21PM",
  "19/02/2026 08:17:36AM", "19/02/2026 01:54:48PM", "19/02/2026 02:35:36PM", "19/02/2026 05:05:08PM",
  "20/02/2026 08:25:12AM", "20/02/2026 01:51:05PM", "20/02/2026 02:15:18PM", "20/02/2026 04:58:28PM",
  "21/02/2026 08:19:18AM", "21/02/2026 01:15:58PM", "23/02/2026 08:19:24AM", "23/02/2026 01:54:06PM",
  "23/02/2026 05:07:17PM", "24/02/2026 08:24:13AM", "24/02/2026 01:52:21PM", "24/02/2026 02:29:09PM",
  "24/02/2026 04:57:15PM", "25/02/2026 08:22:35AM", "25/02/2026 01:40:52PM", "25/02/2026 02:34:44PM",
  "25/02/2026 04:53:47PM", "26/02/2026 08:25:23AM", "26/02/2026 02:00:07PM", "26/02/2026 02:20:40PM",
  "26/02/2026 04:57:57PM", "27/02/2026 07:57:11AM", "27/02/2026 05:04:49PM", "28/02/2026 07:51:01AM",
  "28/02/2026 12:56:28PM"
];

function parseDateTime(dateTimeStr: string): Date {
  // Parse format: "02/02/2026 09:44:13AM"
  const [datePart, timePart] = dateTimeStr.split(' ');
  const [day, month, year] = datePart.split('/').map(Number);
  
  let time = timePart;
  let hour = parseInt(time.substring(0, 2));
  const minute = parseInt(time.substring(3, 5));
  const second = parseInt(time.substring(6, 8));
  const period = time.substring(8); // AM or PM
  
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  
  return new Date(year, month - 1, day, hour, minute, second);
}

function formatTime(date: Date): string {
  return date.toTimeString().substring(0, 8); // HH:MM:SS
}

function calculateWorkHours(inTime: Date, outTime: Date): number {
  const diffMs = outTime.getTime() - inTime.getTime();
  return Math.max(0, diffMs / (1000 * 60 * 60)); // Convert to hours
}

function processDailyPunches(punches: Date[]): {
  inTime1: string | null;
  outTime1: string | null;
  inTime2: string | null;
  outTime2: string | null;
  workHours1: number | null;
  workHours2: number | null;
  totalHours: number | null;
  overtimeHours: number | null;
  status: "present" | "absent" | "late" | "half_day";
} {
  if (punches.length === 0) {
    return {
      inTime1: null, outTime1: null, inTime2: null, outTime2: null,
      workHours1: null, workHours2: null, totalHours: null, overtimeHours: null,
      status: "absent"
    };
  }

  // Sort punches by time
  punches.sort((a, b) => a.getTime() - b.getTime());

  // Use the first punch as In 1 and last punch as Out 2
  let inTime1: Date | null = punches[0];
  let outTime1: Date | null = null;
  let inTime2: Date | null = null;
  let outTime2: Date | null = punches[punches.length - 1];

  // For single punch, In 1 = Out 1
  if (punches.length === 1) {
    outTime1 = punches[0];
    inTime2 = null;
    outTime2 = null;
  } 
  // For two punches, simple In 1 and Out 1
  else if (punches.length === 2) {
    outTime1 = punches[1];
    inTime2 = null;
    outTime2 = null;
  }
  // For three punches, In 1, Out 1, In 2
  else if (punches.length === 3) {
    outTime1 = punches[1];
    inTime2 = punches[2];
    outTime2 = null;
  }
  // For four or more punches, look for natural breaks
  else {
    // Look for lunch break gap (typically 1-2 hours between 11 AM - 2 PM)
    let lunchBreakIndex = -1;
    for (let i = 1; i < punches.length - 1; i++) {
      const currentHour = punches[i].getHours();
      const nextHour = punches[i + 1].getHours();
      const gap = (punches[i + 1].getTime() - punches[i].getTime()) / (1000 * 60 * 60);
      
      // Look for gap around lunch time (11 AM - 2 PM) with at least 30 minutes break
      if ((currentHour >= 11 && currentHour <= 14) && gap >= 0.5 && gap <= 3) {
        lunchBreakIndex = i;
        break;
      }
    }

    if (lunchBreakIndex > 0) {
      // Split at lunch break
      outTime1 = punches[lunchBreakIndex];
      inTime2 = punches[lunchBreakIndex + 1];
      outTime2 = punches[punches.length - 1];
    } else {
      // If no clear lunch break, split in the middle
      const midPoint = Math.floor(punches.length / 2);
      outTime1 = punches[midPoint];
      inTime2 = punches[midPoint + 1];
    }
  }

  const workHours1 = inTime1 && outTime1 ? calculateWorkHours(inTime1, outTime1) : null;
  const workHours2 = inTime2 && outTime2 ? calculateWorkHours(inTime2, outTime2) : null;
  const totalHours = workHours1 && workHours2 ? workHours1 + workHours2 : workHours1;
  const overtimeHours = totalHours && totalHours > 8 ? totalHours - 8 : null;

  // Determine status
  let status: "present" | "absent" | "late" | "half_day" = "present";
  if (inTime1 && (inTime1.getHours() > 8 || (inTime1.getHours() === 8 && inTime1.getMinutes() > 15))) {
    status = "late";
  } else if (totalHours && totalHours < 4) {
    status = "half_day";
  }

  return {
    inTime1: inTime1 ? formatTime(inTime1) : null,
    outTime1: outTime1 ? formatTime(outTime1) : null,
    inTime2: inTime2 ? formatTime(inTime2) : null,
    outTime2: outTime2 ? formatTime(outTime2) : null,
    workHours1,
    workHours2,
    totalHours,
    overtimeHours,
    status
  };
}

async function updateAttendanceFromRawData() {
  console.log("Updating attendance data for employee HR-EMP-00018 (Madiha)...");

  try {
    // Find employee by employee code
    const employee = await db.select().from(employees).where(eq(employees.employeeId, "HR-EMP-00018")).limit(1);
    
    if (employee.length === 0) {
      console.log("❌ Employee HR-EMP-00018 not found. Creating employee record...");
      
      // Create employee record
      const [newEmployee] = await db.insert(employees).values({
        employeeId: "HR-EMP-00018",
        fullName: "Madiha",
        designation: "Employee",
        department: "HR",
        branchId: 1, // Default to Head Office
        shiftId: 1, // Default shift
        joiningDate: "2026-01-01",
        email: "madiha@slpost.lk",
        phone: "+94-XX-XXXXXXX",
        biometricId: "HR-EMP-00018",
        status: "active"
      }).returning();
      
      console.log("✅ Created employee record for HR-EMP-00018");
      
      // Delete existing attendance records for this employee
      await db.delete(attendanceRecords).where(eq(attendanceRecords.employeeId, newEmployee.id));
    } else {
      console.log(`✅ Found employee: ${employee[0].fullName}`);
      
      // Delete existing attendance records for this employee
      await db.delete(attendanceRecords).where(eq(attendanceRecords.employeeId, employee[0].id));
    }

    const empId = employee.length > 0 ? employee[0].id : (await db.select().from(employees).where(eq(employees.employeeId, "HR-EMP-00018")))[0].id;

    // Parse raw data and group by date
    const dailyData: Record<string, Date[]> = {};
    
    for (const timeStr of rawData) {
      const date = parseDateTime(timeStr);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = [];
      }
      dailyData[dateKey].push(date);
    }

    console.log(`📊 Processing ${Object.keys(dailyData).length} days of attendance data...`);

    // Process each day and create attendance records
    const attendanceRecordsToInsert = [];
    
    for (const [date, punches] of Object.entries(dailyData)) {
      const processed = processDailyPunches(punches);
      
      attendanceRecordsToInsert.push({
        employeeId: empId,
        branchId: 1, // Default to Head Office
        date,
        status: processed.status,
        inTime1: processed.inTime1,
        outTime1: processed.outTime1,
        workHours1: processed.workHours1,
        inTime2: processed.inTime2,
        outTime2: processed.outTime2,
        workHours2: processed.workHours2,
        totalHours: processed.totalHours,
        overtimeHours: processed.overtimeHours,
        source: "biometric" as const,
        approvalStatus: "approved" as const
      });
    }

    // Insert attendance records in batches
    const batchSize = 50;
    for (let i = 0; i < attendanceRecordsToInsert.length; i += batchSize) {
      const batch = attendanceRecordsToInsert.slice(i, i + batchSize);
      await db.insert(attendanceRecords).values(batch);
    }

    console.log(`✅ Successfully updated ${attendanceRecordsToInsert.length} attendance records for HR-EMP-00018`);
    
    // Show summary
    const summary = {
      present: attendanceRecordsToInsert.filter(r => r.status === 'present').length,
      late: attendanceRecordsToInsert.filter(r => r.status === 'late').length,
      half_day: attendanceRecordsToInsert.filter(r => r.status === 'half_day').length,
      totalHours: attendanceRecordsToInsert.reduce((sum, r) => sum + (r.totalHours || 0), 0).toFixed(1),
      overtimeHours: attendanceRecordsToInsert.reduce((sum, r) => sum + (r.overtimeHours || 0), 0).toFixed(1)
    };
    
    console.log(`📈 Summary: ${summary.present} present, ${summary.late} late, ${summary.half_day} half-day`);
    console.log(`⏱️  Total work hours: ${summary.totalHours}, Overtime: ${summary.overtimeHours}`);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating attendance data:", error);
    process.exit(1);
  }
}

updateAttendanceFromRawData();
