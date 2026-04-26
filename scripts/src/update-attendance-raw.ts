import { db } from "@workspace/db";
import { attendanceRecords, employees } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";

// Raw attendance data for employee SC-EMP-00005 (ID: 0000000104)
const rawData = [
  // February 2026 - Complete data
  "01/02/2026 12:01:12AM", "01/02/2026 01:00:08AM", "01/02/2026 02:00:09AM", "01/02/2026 03:00:16AM",
  "01/02/2026 04:01:41AM", "01/02/2026 05:00:25AM", "01/02/2026 06:00:45AM", "01/02/2026 07:55:36AM",
  "02/02/2026 07:06:38PM", "02/02/2026 08:02:40PM", "02/02/2026 09:01:36PM", "02/02/2026 10:02:17PM",
  "02/02/2026 11:00:46PM", "03/02/2026 12:02:08AM", "03/02/2026 12:32:58AM", "03/02/2026 01:00:06AM",
  "03/02/2026 01:59:49AM", "03/02/2026 03:00:44AM", "03/02/2026 04:01:00AM", "03/02/2026 05:15:25AM",
  "03/02/2026 06:15:43AM", "03/02/2026 07:01:29AM", "03/02/2026 07:59:17AM", "04/02/2026 07:01:21PM",
  "04/02/2026 08:01:22PM", "04/02/2026 09:01:07PM", "04/02/2026 10:04:40PM", "04/02/2026 11:00:35PM",
  "05/02/2026 12:00:25AM", "05/02/2026 01:01:35AM", "05/02/2026 01:09:05AM", "05/02/2026 02:00:11AM",
  "05/02/2026 03:00:42AM", "05/02/2026 04:06:17AM", "05/02/2026 05:00:46AM", "05/02/2026 06:01:33AM",
  "05/02/2026 06:10:00AM", "05/02/2026 07:00:16AM", "05/02/2026 08:01:26AM", "06/02/2026 07:08:41PM",
  "06/02/2026 09:01:01PM", "06/02/2026 09:09:12PM", "06/02/2026 10:00:12PM", "06/02/2026 11:04:40PM",
  "06/02/2026 11:08:46PM", "07/02/2026 12:00:02AM", "07/02/2026 12:59:26AM", "07/02/2026 02:24:14AM",
  "07/02/2026 04:02:46AM", "07/02/2026 05:04:30AM", "07/02/2026 06:06:30AM", "07/02/2026 07:00:19AM",
  "07/02/2026 07:56:09AM", "08/02/2026 07:05:21PM", "08/02/2026 08:01:53PM", "08/02/2026 09:00:46PM",
  "08/02/2026 10:01:01PM", "08/02/2026 11:01:08PM", "08/02/2026 11:22:22PM", "09/02/2026 12:01:01AM",
  "09/02/2026 12:14:39AM", "09/02/2026 01:00:24AM", "09/02/2026 02:13:09AM", "09/02/2026 03:00:06AM",
  "09/02/2026 04:01:47AM", "09/02/2026 05:00:56AM", "09/02/2026 06:03:31AM", "09/02/2026 07:07:21AM",
  "09/02/2026 07:56:56AM", "10/02/2026 06:53:51PM", "10/02/2026 08:01:22PM", "10/02/2026 09:04:58PM",
  "10/02/2026 10:00:12PM", "10/02/2026 11:02:30PM", "11/02/2026 12:01:03AM", "11/02/2026 01:00:36AM",
  "11/02/2026 02:00:47AM", "11/02/2026 03:01:19AM", "11/02/2026 04:00:19AM", "11/02/2026 04:27:05AM",
  "11/02/2026 05:18:22AM", "11/02/2026 06:22:35AM", "11/02/2026 07:13:00AM", "11/02/2026 07:59:47AM",
  "12/02/2026 07:00:13PM", "12/02/2026 08:00:31PM", "12/02/2026 09:00:20PM", "12/02/2026 10:00:45PM",
  "12/02/2026 11:30:09PM", "13/02/2026 12:01:15AM", "13/02/2026 01:00:26AM", "13/02/2026 02:00:51AM",
  "13/02/2026 03:00:17AM", "13/02/2026 04:00:48AM", "13/02/2026 06:09:56AM", "13/02/2026 07:01:32AM",
  "13/02/2026 07:57:19AM", "14/02/2026 07:08:13PM", "14/02/2026 07:55:54PM", "14/02/2026 08:56:49PM",
  "14/02/2026 09:53:18PM", "14/02/2026 10:57:47PM", "14/02/2026 11:54:57PM", "15/02/2026 12:54:45AM",
  "15/02/2026 02:54:39AM", "15/02/2026 04:11:26AM", "15/02/2026 05:02:19AM", "15/02/2026 05:58:18AM",
  "15/02/2026 06:57:15AM", "15/02/2026 07:55:32AM", "16/02/2026 07:14:48PM", "16/02/2026 08:04:52PM",
  "16/02/2026 08:57:25PM", "16/02/2026 09:57:09PM", "16/02/2026 11:08:55PM", "16/02/2026 11:55:03PM",
  "17/02/2026 01:37:08AM", "17/02/2026 03:48:26AM", "17/02/2026 04:45:21AM", "17/02/2026 05:39:27AM",
  "17/02/2026 06:40:44AM", "18/02/2026 07:16:19PM", "18/02/2026 08:00:30PM", "18/02/2026 09:01:16PM",
  "18/02/2026 10:01:55PM", "18/02/2026 11:01:10PM", "19/02/2026 12:04:01AM", "19/02/2026 01:00:20AM",
  "19/02/2026 02:00:28AM", "19/02/2026 03:14:56AM", "19/02/2026 04:00:08AM", "19/02/2026 05:00:59AM",
  "19/02/2026 06:02:06AM", "19/02/2026 07:05:58AM", "19/02/2026 08:08:36AM", "20/02/2026 06:47:56PM",
  "20/02/2026 08:01:04PM", "20/02/2026 09:00:59PM", "20/02/2026 10:00:07PM", "20/02/2026 11:00:53PM",
  "21/02/2026 12:00:21AM", "21/02/2026 01:00:59AM", "21/02/2026 01:18:15AM", "21/02/2026 02:00:39AM",
  "21/02/2026 03:02:54AM", "21/02/2026 04:01:58AM", "21/02/2026 05:01:23AM", "21/02/2026 06:08:25AM",
  "21/02/2026 07:02:13AM", "21/02/2026 07:56:01AM", "22/02/2026 07:07:20PM", "22/02/2026 08:00:34PM",
  "22/02/2026 09:01:33PM", "22/02/2026 10:01:10PM", "22/02/2026 10:06:04PM", "22/02/2026 11:01:19PM",
  "22/02/2026 11:59:48PM", "23/02/2026 01:01:52AM", "23/02/2026 02:00:07AM", "23/02/2026 03:04:59AM",
  "23/02/2026 04:01:17AM", "23/02/2026 05:01:18AM", "23/02/2026 06:00:16AM", "23/02/2026 07:02:07AM",
  "23/02/2026 07:11:43AM", "23/02/2026 07:52:57AM", "23/02/2026 07:13:57PM", "23/02/2026 08:03:10PM",
  "23/02/2026 09:02:41PM", "23/02/2026 10:11:09PM", "23/02/2026 10:33:29PM", "23/02/2026 11:28:49PM",
  "24/02/2026 12:03:02AM", "24/02/2026 01:02:14AM", "24/02/2026 02:00:33AM", "24/02/2026 03:06:16AM",
  "24/02/2026 04:00:32AM", "24/02/2026 04:53:11AM", "24/02/2026 05:02:41AM", "24/02/2026 06:00:49AM",
  "24/02/2026 07:00:41AM", "24/02/2026 07:57:18AM", "24/02/2026 06:48:54PM", "24/02/2026 09:01:06PM",
  "24/02/2026 10:00:58PM", "24/02/2026 11:01:56PM", "24/02/2026 11:03:45PM", "25/02/2026 12:00:20AM",
  "25/02/2026 02:00:28AM", "25/02/2026 04:02:33AM", "25/02/2026 05:00:22AM", "25/02/2026 06:15:51AM",
  "25/02/2026 07:02:23AM", "25/02/2026 08:05:36AM", "28/02/2026 07:28:29PM", "28/02/2026 09:00:06PM",
  "28/02/2026 10:01:11PM", "28/02/2026 11:00:26PM"
];

function parseDateTime(dateTimeStr: string): Date {
  // Parse format: "04/02/2026 08:01:22PM"
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
  console.log("Updating attendance data for employee SC-EMP-00005...");

  try {
    // Find employee by employee code
    const employee = await db.select().from(employees).where(eq(employees.employeeId, "SC-EMP-00005")).limit(1);
    
    if (employee.length === 0) {
      console.log("❌ Employee SC-EMP-00005 not found. Creating employee record...");
      
      // Create employee record
      const [newEmployee] = await db.insert(employees).values({
        employeeId: "SC-EMP-00005",
        fullName: "Polhena Abeyrathne",
        designation: "Employee",
        department: "Operations",
        branchId: 1, // Default to Head Office
        shiftId: 1, // Default shift
        joiningDate: "2026-01-01",
        email: "polhena.abeyrathne@slpost.lk",
        phone: "+94-XX-XXXXXXX",
        biometricId: "0000000104",
        status: "active"
      }).returning();
      
      console.log("✅ Created employee record for SC-EMP-00005");
      
      // Delete existing attendance records for this employee
      await db.delete(attendanceRecords).where(eq(attendanceRecords.employeeId, newEmployee.id));
    } else {
      console.log(`✅ Found employee: ${employee[0].fullName}`);
      
      // Delete existing attendance records for this employee
      await db.delete(attendanceRecords).where(eq(attendanceRecords.employeeId, employee[0].id));
    }

    const empId = employee.length > 0 ? employee[0].id : (await db.select().from(employees).where(eq(employees.employeeId, "SC-EMP-00005")))[0].id;

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

    console.log(`✅ Successfully updated ${attendanceRecordsToInsert.length} attendance records for SC-EMP-00005`);
    
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
