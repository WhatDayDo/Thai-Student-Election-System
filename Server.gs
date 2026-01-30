//  ใส่ ID ของ Google Sheets ของคุณครู
const SS_ID = "ID ของ Google Sheets ของคุณครู"; 
const ADMIN_PASSWORD = "1234"; 

function getSS() {
  return SpreadsheetApp.openById(SS_ID);
}

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('ระบบเลือกตั้งประธานนักเรียน | ASL')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function verifyAdmin(pass) {
  return pass === ADMIN_PASSWORD;
}

function checkLogin(studentId) {
  try {
    const ss = getSS();
    const studentSheet = ss.getSheetByName('Students'); // [cite: 106]
    const voteSheet = ss.getSheetByName('Votes');
    if (!studentSheet) return { success: false, message: "ไม่พบชีต Students" };
    
    const cleanId = studentId.trim();
    const studentCell = studentSheet.getRange("A:A").createTextFinder(cleanId).matchEntireCell(true).findNext();
    
    if (!studentCell) return { success: false, message: "ไม่พบรหัสประจำตัวนี้ในระบบ" }; // [cite: 107]

    const row = studentCell.getRow();
    const data = studentSheet.getRange(row, 1, 1, 4).getDisplayValues()[0];
    const hasVoted = voteSheet ? voteSheet.getRange("C:C").createTextFinder(cleanId).matchEntireCell(true).findNext() : false; // [cite: 108]

    return { 
      success: true, 
      hasVoted: !!hasVoted, 
      studentId: data[0], 
      studentName: data[1],
      level: data[2],
      room: data[3]
    };
  } catch (e) {
    return { success: false, message: e.toString() }; // [cite: 109]
  }
}

function recordVote(data) {
  try {
    const ss = getSS();
    let voteSheet = ss.getSheetByName('Votes') || ss.insertSheet('Votes');
    // [cite: 111] บันทึก: เวลา, ID ผู้สมัคร, ID นักเรียน, ชั้น, ห้อง
    voteSheet.appendRow([new Date(), data.candidateId, data.studentId, data.level, data.room]);
    return "Success";
  } catch (e) {
    return "Error: " + e.toString();
  }
}

function getCandidates() {
  try {
    const sheet = getSS().getSheetByName('Candidates');
    if (!sheet) return [];
    const data = sheet.getDataRange().getDisplayValues(); // [cite: 113]
    return data.slice(1).map(row => ({ id: row[0], name: row[1], policy: row[2], imageUrl: row[3] }));
  } catch(e) { return []; }
}

function getTurnoutStats() {
  try {
    const ss = getSS();
    const studentSheet = ss.getSheetByName('Students');
    const voteSheet = ss.getSheetByName('Votes');
    
    if (!studentSheet) return { total: 0, voted: 0, rooms: {} };

    const studentsRaw = studentSheet.getDataRange().getDisplayValues(); // [cite: 115]
    const votesRaw = voteSheet ? voteSheet.getDataRange().getDisplayValues() : [];
    
    studentsRaw.shift(); // ตัดหัวตาราง
    const students = studentsRaw.filter(r => r[0] !== ""); // กรองเฉพาะแถวที่มีรหัสนักเรียน
    
    if (votesRaw.length > 0) votesRaw.shift();
    const votes = votesRaw.filter(r => r[2] !== ""); // กรองเฉพาะแถวที่มีการโหวตจริง

    const turnoutByRoom = {};
    students.forEach(r => {
      const key = `${r[2]}/${r[3]}`; // สร้าง Key เช่น "ม.4/1"
      if (!turnoutByRoom[key]) turnoutByRoom[key] = { total: 0, voted: 0 };
      turnoutByRoom[key].total++;
    });

    votes.forEach(r => {
      const key = `${r[3]}/${r[4]}`; // [cite: 117] Level อยู่คอลัมน์ 4, Room อยู่คอลัมน์ 5
      if (turnoutByRoom[key]) turnoutByRoom[key].voted++;
    });

    return { total: students.length, voted: votes.length, rooms: turnoutByRoom }; // [cite: 118]
  } catch (e) {
    return { total: 0, voted: 0, rooms: {} };
  }
}

function getAdminVoteSummary() {
  try {
    const ss = getSS();
    const voteSheet = ss.getSheetByName('Votes');
    if (!voteSheet || voteSheet.getLastRow() < 2) return {}; // [cite: 120]
    const data = voteSheet.getDataRange().getValues();
    return data.slice(1).reduce((acc, row) => {
      const id = row[1];
      acc[id] = (acc[id] || 0) + 1; // [cite: 121]
      return acc;
    }, {});
  } catch(e) { return {}; }
}
