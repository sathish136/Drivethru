import { db } from "@workspace/db";
import { branches, shifts, departments, designations, employees } from "@workspace/db/schema";

async function main() {
  console.log("Starting employee import...");

  // 1. Create branches
  const branchData = [
    { name: "Drivethru Main", code: "DT-MAIN", type: "head_office" as const, isActive: true },
    { name: "Schlumi Main",   code: "SC-MAIN", type: "regional"   as const, isActive: true },
  ];
  const insertedBranches = await db.insert(branches).values(branchData).onConflictDoNothing().returning();
  const allBranches = await db.select().from(branches);
  const branchMap: Record<string, number> = {};
  allBranches.forEach(b => { branchMap[b.name] = b.id; });
  console.log("Branches:", branchMap);

  // 2. Create a default shift
  const shiftData = [
    { name: "Regular Shift",      type: "normal" as const, startTime1: "08:00", endTime1: "17:00", graceMinutes: 15, overtimeThreshold: 30, isActive: true },
    { name: "Night Watcher Shift",type: "normal" as const, startTime1: "20:00", endTime1: "08:00", graceMinutes: 10, overtimeThreshold: 60, isActive: true },
  ];
  await db.insert(shifts).values(shiftData).onConflictDoNothing();
  const allShifts = await db.select().from(shifts);
  const defaultShiftId = allShifts[0]?.id;
  console.log("Default shift ID:", defaultShiftId);

  // 3. Create departments
  const deptNames = ["House Keeping", "Front Office", "Admin", "Kitchen", "Surf Instructors", "Security", "Maintainance"];
  const deptRows = deptNames.map((name, i) => ({ name, code: name.toUpperCase().replace(/[^A-Z]/g, "").slice(0,6) + i, isActive: true }));
  await db.insert(departments).values(deptRows).onConflictDoNothing();
  const allDepts = await db.select().from(departments);
  const deptMap: Record<string, number> = {};
  allDepts.forEach(d => { deptMap[d.name] = d.id; });
  console.log("Departments:", deptMap);

  // 4. Create designations
  const desigNames = ["Room Attendant","Receptionist","Manager","Kitchen Helper","Photographer","Instructor","Night Watcher","Accounts Admin Executive","Gardner","Chef","Assistant Cook"];
  const deptForDesig: Record<string, string> = {
    "Room Attendant": "House Keeping",
    "Receptionist":   "Front Office",
    "Manager":        "Admin",
    "Kitchen Helper": "Kitchen",
    "Photographer":   "Surf Instructors",
    "Instructor":     "Surf Instructors",
    "Night Watcher":  "Security",
    "Accounts Admin Executive": "Admin",
    "Gardner":        "Maintainance",
    "Chef":           "Kitchen",
    "Assistant Cook": "Kitchen",
  };
  const desigRows = desigNames.map((name, i) => ({
    name,
    code: name.toUpperCase().replace(/[^A-Z]/g,"").slice(0,6) + i,
    level: 1,
    departmentId: deptMap[deptForDesig[name]] || null,
    isActive: true,
  }));
  await db.insert(designations).values(desigRows).onConflictDoNothing();
  const allDesigs = await db.select().from(designations);
  const desigMap: Record<string, number> = {};
  allDesigs.forEach(d => { desigMap[d.name] = d.id; });
  console.log("Designations:", desigMap);

  // 5. Import employees from CSV
  const csvEmployees = [
    { employeeId: "SC-EMP-00004", biometricId: "18",  firstName: "Nimesh",       lastName: "Dananjaya",                      gender: "male",   designation: "Room Attendant",          department: "House Keeping",    branch: "Schlumi Main",   type: "permanent", status: "active", phone: "+94000000018", email: "nimesh@schlumi.lk",          nic: "",  epf: "18",  etf: "",   joining: "2023-08-05" },
    { employeeId: "HR-EMP-00026", biometricId: "49",  firstName: "K.D. Achintha",lastName: "Madushanith Nadeera",             gender: "male",   designation: "Receptionist",            department: "Front Office",     branch: "Drivethru Main", type: "permanent", status: "active", phone: "+94000000049", email: "kd.achintha@drivethru.lk",   nic: "",  epf: "49",  etf: "",   joining: "2020-01-01" },
    { employeeId: "SC-EMP-00001", biometricId: "52",  firstName: "Anuradha",      lastName: "Abeysinghe Bandara",             gender: "male",   designation: "Manager",                 department: "Admin",            branch: "Schlumi Main",   type: "permanent", status: "active", phone: "+94000000052", email: "anuradha@schlumi.lk",         nic: "",  epf: "52",  etf: "52", joining: "2024-10-01" },
    { employeeId: "HR-EMP-00021", biometricId: "34",  firstName: "Ramayalatha W.",lastName: "Gunasekara",                     gender: "male",   designation: "Kitchen Helper",          department: "Kitchen",          branch: "Drivethru Main", type: "permanent", status: "active", phone: "+94000000034", email: "rw.gunasekara@drivethru.lk", nic: "",  epf: "34",  etf: "34", joining: "2020-01-01" },
    { employeeId: "HR-EMP-00022", biometricId: "48",  firstName: "Lakshan Y.",    lastName: "Wickramasinghe Mohotti",         gender: "male",   designation: "Photographer",            department: "Surf Instructors", branch: "Drivethru Main", type: "permanent", status: "active", phone: "+94000000048", email: "ly.wickramasinghe@drivethru.lk", nic: "", epf: "48", etf: "48", joining: "2020-01-01" },
    { employeeId: "HR-EMP-00023", biometricId: "54",  firstName: "Mari Chehan",   lastName: "Chanuka Nambukara Wellalage",    gender: "male",   designation: "Instructor",              department: "Surf Instructors", branch: "Drivethru Main", type: "permanent", status: "active", phone: "+94000000054", email: "chehan.chanuka@drivethru.lk", nic: "",  epf: "54",  etf: "",   joining: "2020-01-01" },
    { employeeId: "HR-EMP-00024", biometricId: "56",  firstName: "K Ridmika H",   lastName: "Karunawardhana",                 gender: "male",   designation: "Instructor",              department: "Surf Instructors", branch: "Drivethru Main", type: "permanent", status: "active", phone: "+94000000056", email: "krh.karunawardhana@drivethru.lk", nic: "", epf: "56", etf: "", joining: "2020-01-01" },
    { employeeId: "HR-EMP-00027", biometricId: "5",   firstName: "Nadun",         lastName: "Moni",                           gender: "male",   designation: "Instructor",              department: "Surf Instructors", branch: "Drivethru Main", type: "permanent", status: "active", phone: "+94000000005", email: "nadun.moni@drivethru.lk",    nic: "",  epf: "5",   etf: "",   joining: "2020-01-01" },
    { employeeId: "HR-EMP-00002", biometricId: "60",  firstName: "Anura",         lastName: "Manamperi",                      gender: "male",   designation: "Night Watcher",           department: "Security",         branch: "Drivethru Main", type: "permanent", status: "active", phone: "",            email: "",                            nic: "",  epf: "6",   etf: "",   joining: "2014-12-01" },
    { employeeId: "HR-EMP-00018", biometricId: "55",  firstName: "Achala",        lastName: "A A S De Silva",                 gender: "female", designation: "Accounts Admin Executive",department: "Admin",            branch: "Drivethru Main", type: "permanent", status: "active", phone: "",            email: "",                            nic: "",  epf: "55",  etf: "55", joining: "2025-09-01" },
    { employeeId: "SC-EMP-00003", biometricId: "13",  firstName: "Ashoka",        lastName: "Damayanthi",                     gender: "female", designation: "Room Attendant",          department: "House Keeping",    branch: "Schlumi Main",   type: "permanent", status: "active", phone: "+94000000013", email: "ashoka@schlumi.lk",           nic: "",  epf: "13",  etf: "",   joining: "2018-01-02" },
    { employeeId: "SC-EMP-00002", biometricId: "5",   firstName: "Nadun",         lastName: "Moni",                           gender: "male",   designation: "Instructor",              department: "Surf Instructors", branch: "Schlumi Main",   type: "permanent", status: "active", phone: "+94000000005", email: "nadun@schlumi.lk",            nic: "",  epf: "5",   etf: "",   joining: "2017-04-01" },
    { employeeId: "HR-EMP-00005", biometricId: "41",  firstName: "Ananda",        lastName: "Silva",                          gender: "male",   designation: "Room Attendant",          department: "House Keeping",    branch: "Drivethru Main", type: "permanent", status: "active", phone: "",            email: "",                            nic: "",  epf: "41",  etf: "",   joining: "2017-04-01" },
    { employeeId: "HR-EMP-00003", biometricId: "20",  firstName: "K.A.",          lastName: "Jayalath",                       gender: "male",   designation: "Night Watcher",           department: "Security",         branch: "Drivethru Main", type: "permanent", status: "active", phone: "",            email: "",                            nic: "",  epf: "7",   etf: "",   joining: "2014-12-01" },
    { employeeId: "HR-EMP-00004", biometricId: "9",   firstName: "M.A.",          lastName: "Jayantha",                       gender: "male",   designation: "Gardner",                 department: "Maintainance",     branch: "Drivethru Main", type: "permanent", status: "active", phone: "",            email: "",                            nic: "",  epf: "9",   etf: "",   joining: "2015-05-01" },
    { employeeId: "HR-EMP-00012", biometricId: "58",  firstName: "M A",           lastName: "Kavishka",                       gender: "male",   designation: "Kitchen Helper",          department: "Kitchen",          branch: "Drivethru Main", type: "permanent", status: "active", phone: "",            email: "",                            nic: "",  epf: "58",  etf: "",   joining: "2025-10-01" },
    { employeeId: "HR-EMP-00006", biometricId: "42",  firstName: "R.K.",          lastName: "Kusumawathi",                    gender: "female", designation: "Room Attendant",          department: "House Keeping",    branch: "Drivethru Main", type: "permanent", status: "active", phone: "",            email: "",                            nic: "",  epf: "42",  etf: "",   joining: "2022-05-01" },
    { employeeId: "HR-EMP-00011", biometricId: "57",  firstName: "Pramila",       lastName: "Chamod Wellehewa",               gender: "male",   designation: "Chef",                    department: "Kitchen",          branch: "Drivethru Main", type: "permanent", status: "active", phone: "",            email: "",                            nic: "",  epf: "57",  etf: "",   joining: "2025-10-01" },
    { employeeId: "HR-EMP-00008", biometricId: "50",  firstName: "Chamil",        lastName: "Asuntha Rathnayaka Koralege",    gender: "male",   designation: "Room Attendant",          department: "House Keeping",    branch: "Drivethru Main", type: "permanent", status: "active", phone: "",            email: "",                            nic: "",  epf: "50",  etf: "",   joining: "2023-11-01" },
    { employeeId: "HR-EMP-00013", biometricId: "59",  firstName: "Inosha",        lastName: "Lakmali",                        gender: "female", designation: "Kitchen Helper",          department: "Kitchen",          branch: "Drivethru Main", type: "permanent", status: "active", phone: "",            email: "",                            nic: "",  epf: "59",  etf: "",   joining: "2025-12-18" },
    { employeeId: "SC-EMP-00005", biometricId: "44",  firstName: "V.A.",          lastName: "Abeyratne",                      gender: "male",   designation: "Night Watcher",           department: "Security",         branch: "Schlumi Main",   type: "permanent", status: "active", phone: "+94000000044", email: "va.abeyratne@schlumi.lk",     nic: "",  epf: "44",  etf: "",   joining: "2022-08-15" },
    { employeeId: "HR-EMP-00020", biometricId: "52",  firstName: "Anuradha",      lastName: "Abeysinghe Bandara",             gender: "male",   designation: "Manager",                 department: "Admin",            branch: "Drivethru Main", type: "permanent", status: "active", phone: "",            email: "",                            nic: "",  epf: "52",  etf: "",   joining: "2024-10-01" },
    { employeeId: "HR-EMP-00015", biometricId: "53",  firstName: "Chathuni",      lastName: "Amasha Ruwanpathirana",          gender: "female", designation: "Instructor",              department: "Surf Instructors", branch: "Drivethru Main", type: "permanent", status: "active", phone: "",            email: "",                            nic: "",  epf: "53",  etf: "",   joining: "2024-10-01" },
    { employeeId: "SC-EMP-00006", biometricId: "45",  firstName: "K.H.",          lastName: "Udayasiri Sarath",               gender: "male",   designation: "Night Watcher",           department: "Security",         branch: "Schlumi Main",   type: "permanent", status: "active", phone: "+94000000045", email: "kh.udayasiri@schlumi.lk",     nic: "",  epf: "45",  etf: "",   joining: "2022-08-27" },
    { employeeId: "HR-EMP-00010", biometricId: "46",  firstName: "H.K. Chamika",  lastName: "Ruwan Kumara",                   gender: "male",   designation: "Assistant Cook",          department: "Kitchen",          branch: "Drivethru Main", type: "permanent", status: "active", phone: "",            email: "",                            nic: "",  epf: "46",  etf: "",   joining: "2021-11-01" },
    { employeeId: "HR-EMP-00007", biometricId: "47",  firstName: "G.S. Thimira",  lastName: "Nethsara",                       gender: "male",   designation: "Room Attendant",          department: "House Keeping",    branch: "Drivethru Main", type: "permanent", status: "active", phone: "",            email: "",                            nic: "",  epf: "47",  etf: "",   joining: "2023-10-15" },
  ];

  const empRows = csvEmployees.map(e => ({
    employeeId:    e.employeeId,
    firstName:     e.firstName,
    lastName:      e.lastName,
    fullName:      `${e.firstName} ${e.lastName}`,
    gender:        e.gender as "male" | "female",
    designation:   e.designation,
    department:    e.department,
    branchId:      branchMap[e.branch],
    shiftId:       defaultShiftId,
    joiningDate:   e.joining,
    email:         e.email || null,
    phone:         e.phone || null,
    biometricId:   e.biometricId,
    status:        e.status as "active" | "on_leave" | "resigned" | "terminated",
    employeeType:  e.type as "permanent" | "contract" | "casual",
    epfNumber:     e.epf || null,
    etfNumber:     e.etf || null,
    nicNumber:     e.nic || null,
  }));

  const inserted = await db.insert(employees).values(empRows).onConflictDoNothing().returning();
  console.log(`Imported ${inserted.length} employees successfully!`);

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
