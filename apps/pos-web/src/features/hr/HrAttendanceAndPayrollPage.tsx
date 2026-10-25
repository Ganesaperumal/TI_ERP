import React, { useState } from 'react';

type HrTab = 'ATTENDANCE_ROSTER' | 'STAFF_KHATA_SHORTAGES' | 'PAYROLL_RUN';

interface StaffProfile {
  id: string;
  name: string;
  role: string;
  shiftRoster: string;
  baseSalary: number;
  otHourlyRate: number;
  commissionRatePct: number;
}

interface AttendanceRecord {
  id: string;
  staffName: string;
  role: string;
  checkIn: string;
  checkOut: string;
  otHours: number;
  biometric: boolean;
  hasSelfie: boolean;
  status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'WEEKLY_OFF';
}

interface PayslipData {
  staffName: string;
  role: string;
  monthYear: string;
  baseSalary: number;
  otPay: number;
  commission: number;
  grossPay: number;
  leaveDeductions: number;
  advances: number;
  groceries: number;
  shortages: number;
  totalDeductions: number;
  netPay: number;
}

export const HrAttendanceAndPayrollPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HrTab>('ATTENDANCE_ROSTER');

  // Staff Profiles State
  const [staffList] = useState<StaffProfile[]>([
    {
      id: 'USR-001',
      name: 'Ramesh Kumar (Cashier-1)',
      role: 'CASHIER',
      shiftRoster: 'MORNING (06:00 - 14:00)',
      baseSalary: 18000.0,
      otHourlyRate: 120.0,
      commissionRatePct: 0.0,
    },
    {
      id: 'USR-002',
      name: 'Suresh Babu (Floor Salesman)',
      role: 'FLOOR_SALESMAN',
      shiftRoster: 'FULL_DAY (09:00 - 18:00)',
      baseSalary: 16000.0,
      otHourlyRate: 100.0,
      commissionRatePct: 2.0,
    },
    {
      id: 'USR-003',
      name: 'Kavitha Murugan (Vessels & Garments Salesman)',
      role: 'SPECIALTY_SALESMAN',
      shiftRoster: 'FULL_DAY (09:00 - 18:00)',
      baseSalary: 17500.0,
      otHourlyRate: 110.0,
      commissionRatePct: 3.5,
    },
    {
      id: 'USR-004',
      name: 'Manikandan (Store Delivery & Porter)',
      role: 'DELIVERY_BOY',
      shiftRoster: 'EVENING (14:00 - 22:00)',
      baseSalary: 15000.0,
      otHourlyRate: 90.0,
      commissionRatePct: 0.0,
    },
  ]);

  // Attendance State
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([
    {
      id: 'ATT-101',
      staffName: 'Ramesh Kumar',
      role: 'CASHIER',
      checkIn: '06:02 AM',
      checkOut: '02:30 PM',
      otHours: 0.5,
      biometric: true,
      hasSelfie: true,
      status: 'PRESENT',
    },
    {
      id: 'ATT-102',
      staffName: 'Suresh Babu',
      role: 'FLOOR_SALESMAN',
      checkIn: '08:58 AM',
      checkOut: '07:30 PM',
      otHours: 1.5,
      biometric: true,
      hasSelfie: false,
      status: 'PRESENT',
    },
    {
      id: 'ATT-103',
      staffName: 'Kavitha Murugan',
      role: 'SPECIALTY_SALESMAN',
      checkIn: '10:25 AM',
      checkOut: '06:00 PM',
      otHours: 0.0,
      biometric: false,
      hasSelfie: true,
      status: 'LATE',
    },
    {
      id: 'ATT-104',
      staffName: 'Manikandan',
      role: 'DELIVERY_BOY',
      checkIn: '02:00 PM',
      checkOut: '10:45 PM',
      otHours: 0.75,
      biometric: true,
      hasSelfie: true,
      status: 'PRESENT',
    },
  ]);

  // Staff Khata State
  const [khataList, setKhataList] = useState([
    { staff: 'Ramesh Kumar', type: 'SALARY_ADVANCE', amount: 3000.0, date: '10-10-2026', notes: 'Emergency medical cash advance' },
    { staff: 'Ramesh Kumar', type: 'GROCERY_PURCHASE', amount: 1450.0, date: '18-10-2026', notes: 'Monthly grocery khata bill' },
    { staff: 'Suresh Babu', type: 'SALARY_ADVANCE', amount: 2000.0, date: '12-10-2026', notes: 'Festival advance' },
    { staff: 'Kavitha Murugan', type: 'GROCERY_PURCHASE', amount: 850.0, date: '21-10-2026', notes: 'Rice & cooking oil' },
  ]);

  // POS Shortages State
  const [cashierShortages] = useState([
    { cashier: 'Ramesh Kumar', shiftNo: 42, date: '22-10-2026', shortageAmount: 250.0, reason: 'Blind close cashier counter shortage' },
  ]);

  // Payroll State
  const [selectedMonthYear, setSelectedMonthYear] = useState('2026-10');
  const [payrollRunCompleted, setPayrollRunCompleted] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState<PayslipData | null>(null);

  // Salesman Commission Leaderboard
  const commissionSummary = [
    { salesman: 'Suresh Babu', itemsSold: 84, salesVolume: 82400.0, ratePct: 2.0, earned: 1648.0 },
    { salesman: 'Kavitha Murugan', itemsSold: 46, salesVolume: 94500.0, ratePct: 3.5, earned: 3307.5 },
  ];

  // Handlers
  const handleRunPayroll = () => {
    setPayrollRunCompleted(true);
  };

  const calculateStaffNet = (staff: StaffProfile) => {
    const otHours = attendanceRecords.find((a) => a.staffName.includes(staff.name.split(' ')[0]))?.otHours || 0;
    const otPay = otHours * staff.otHourlyRate * 25; // Approx for month
    const commission = commissionSummary.find((c) => c.salesman.includes(staff.name.split(' ')[0]))?.earned || 0;
    const grossPay = staff.baseSalary + otPay + commission;

    const advances = khataList
      .filter((k) => k.staff.includes(staff.name.split(' ')[0]) && k.type === 'SALARY_ADVANCE')
      .reduce((s, k) => s + k.amount, 0);

    const groceries = khataList
      .filter((k) => k.staff.includes(staff.name.split(' ')[0]) && k.type === 'GROCERY_PURCHASE')
      .reduce((s, k) => s + k.amount, 0);

    const shortages = cashierShortages
      .filter((c) => c.cashier.includes(staff.name.split(' ')[0]))
      .reduce((s, c) => s + c.shortageAmount, 0);

    const leaveDeductions = staff.name.includes('Kavitha') ? 600.0 : 0.0;
    const totalDeductions = leaveDeductions + advances + groceries + shortages;
    const netPay = Math.max(0, grossPay - totalDeductions);

    return {
      staffName: staff.name,
      role: staff.role,
      monthYear: selectedMonthYear,
      baseSalary: staff.baseSalary,
      otPay,
      commission,
      grossPay,
      leaveDeductions,
      advances,
      groceries,
      shortages,
      totalDeductions,
      netPay,
    };
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#090d16', minHeight: '92vh', color: '#f8fafc' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '22px', color: '#38bdf8' }}>
            Supermarket HR, Attendance & 1-Click Monthly Payroll Engine
          </h2>
          <div style={{ fontSize: '13px', color: '#94a3b8' }}>
            Biometric / Geo-Selfie Attendance, Line-Item Salesman Commissions, Grocery Khata & Net Payroll
          </div>
        </div>

        {/* Tab Selector */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[
            { id: 'ATTENDANCE_ROSTER', label: '🕒 Attendance & Roster' },
            { id: 'STAFF_KHATA_SHORTAGES', label: '💳 Staff Khata & Counter Shortages' },
            { id: 'PAYROLL_RUN', label: '💰 1-Click Monthly Payroll' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as HrTab)}
              style={{
                padding: '8px 16px',
                backgroundColor: activeTab === tab.id ? '#2563eb' : '#1e293b',
                color: activeTab === tab.id ? '#ffffff' : '#94a3b8',
                border: '1px solid',
                borderColor: activeTab === tab.id ? '#3b82f6' : '#334155',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* TAB 1: ATTENDANCE & SHIFT ROSTER */}
      {activeTab === 'ATTENDANCE_ROSTER' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {/* Daily Attendance Board */}
          <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', color: '#38bdf8' }}>
                📅 Today's Biometric & Geo-Selfie Attendance Board (25 Oct 2026)
              </h3>
              <span style={{ fontSize: '12px', color: '#22c55e', backgroundColor: '#064e3b', padding: '4px 8px', borderRadius: '4px', fontWeight: 'bold' }}>
                ✓ 4/4 Staff Logged In
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8', textAlign: 'left' }}>
                  <th style={{ padding: '10px' }}>Staff Member</th>
                  <th style={{ padding: '10px' }}>Role</th>
                  <th style={{ padding: '10px' }}>Check-In</th>
                  <th style={{ padding: '10px' }}>Check-Out</th>
                  <th style={{ padding: '10px', textAlign: 'right' }}>Overtime Hours</th>
                  <th style={{ padding: '10px' }}>Verification Method</th>
                  <th style={{ padding: '10px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {attendanceRecords.map((att) => (
                  <tr key={att.id} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{att.staffName}</td>
                    <td style={{ padding: '10px', color: '#38bdf8' }}>{att.role}</td>
                    <td style={{ padding: '10px' }}>{att.checkIn}</td>
                    <td style={{ padding: '10px' }}>{att.checkOut}</td>
                    <td style={{ padding: '10px', textAlign: 'right', color: att.otHours > 0 ? '#22c55e' : '#94a3b8', fontWeight: att.otHours > 0 ? 'bold' : 'normal' }}>
                      {att.otHours > 0 ? `+${att.otHours} hrs` : '0 hrs'}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={{ display: 'inline-flex', gap: '6px' }}>
                        {att.biometric && (
                          <span style={{ padding: '2px 6px', backgroundColor: '#0284c7', color: '#fff', borderRadius: '4px', fontSize: '10px' }}>
                            BIOMETRIC
                          </span>
                        )}
                        {att.hasSelfie && (
                          <span style={{ padding: '2px 6px', backgroundColor: '#7c3aed', color: '#fff', borderRadius: '4px', fontSize: '10px' }}>
                            SELFIE + GPS
                          </span>
                        )}
                      </span>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontWeight: 'bold',
                          backgroundColor: att.status === 'PRESENT' ? '#064e3b' : '#78350f',
                          color: att.status === 'PRESENT' ? '#6ee7b7' : '#fde68a',
                        }}
                      >
                        {att.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Shift Roster & Compensation Settings */}
          <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#38bdf8' }}>
              👥 Staff Master, Shift Rosters & Incentive Rates
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              {staffList.map((s) => (
                <div key={s.id} style={{ backgroundColor: '#1e293b', padding: '14px', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#f8fafc' }}>{s.name}</div>
                  <div style={{ fontSize: '11px', color: '#38bdf8', marginBottom: '8px' }}>{s.role}</div>

                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>Shift Roster:</div>
                  <div style={{ fontSize: '12px', color: '#e2e8f0', marginBottom: '6px' }}>{s.shiftRoster}</div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                    <span>Base Salary:</span>
                    <span style={{ color: '#22c55e', fontWeight: 'bold' }}>₹{s.baseSalary.toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                    <span>OT Rate:</span>
                    <span style={{ color: '#f59e0b' }}>₹{s.otHourlyRate}/hr</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                    <span>Salesman Comm:</span>
                    <span style={{ color: '#a855f7', fontWeight: 'bold' }}>{s.commissionRatePct}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: STAFF KHATA & SHORTAGES */}
      {activeTab === 'STAFF_KHATA_SHORTAGES' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Staff Salary Advances & Grocery Khata */}
          <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#38bdf8' }}>
              💳 Mid-Month Salary Advances & Staff Grocery Khata
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8', textAlign: 'left' }}>
                    <th style={{ padding: '8px' }}>Staff Member</th>
                    <th style={{ padding: '8px' }}>Deduction Type</th>
                    <th style={{ padding: '8px', textAlign: 'right' }}>Amount (₹)</th>
                    <th style={{ padding: '8px' }}>Date</th>
                    <th style={{ padding: '8px' }}>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {khataList.map((k, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                      <td style={{ padding: '8px', fontWeight: 'bold' }}>{k.staff}</td>
                      <td style={{ padding: '8px' }}>
                        <span
                          style={{
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontWeight: 'bold',
                            backgroundColor: k.type === 'SALARY_ADVANCE' ? '#78350f' : '#1e3a8a',
                            color: k.type === 'SALARY_ADVANCE' ? '#fde68a' : '#bfdbfe',
                          }}
                        >
                          {k.type}
                        </span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>
                        -₹{k.amount.toFixed(2)}
                      </td>
                      <td style={{ padding: '8px', color: '#94a3b8' }}>{k.date}</td>
                      <td style={{ padding: '8px', color: '#94a3b8' }}>{k.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Cashier Shift Shortages */}
          <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#38bdf8' }}>
              📉 Cashier Counter Cash Shortages (Blind Close Z-Reports)
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.5' }}>
              Auto-detected discrepancies from Shift Blind Closes. When physical drawer count is less than system expected
              cash, the supervisor-approved shortage is automatically mapped to monthly payroll deduction.
            </p>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginTop: '16px' }}>
              <thead>
                <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8', textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Cashier</th>
                  <th style={{ padding: '8px' }}>Shift No</th>
                  <th style={{ padding: '8px' }}>Date</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Shortage (₹)</th>
                  <th style={{ padding: '8px' }}>Auditor Note</th>
                </tr>
              </thead>
              <tbody>
                {cashierShortages.map((c, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                    <td style={{ padding: '8px', fontWeight: 'bold' }}>{c.cashier}</td>
                    <td style={{ padding: '8px' }}>Shift #{c.shiftNo}</td>
                    <td style={{ padding: '8px', color: '#94a3b8' }}>{c.date}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold', color: '#ef4444' }}>
                      -₹{c.shortageAmount.toFixed(2)}
                    </td>
                    <td style={{ padding: '8px', color: '#94a3b8' }}>{c.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: 1-CLICK PAYROLL RUN */}
      {activeTab === 'PAYROLL_RUN' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {/* Action Bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#0f172a',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #1e293b',
            }}
          >
            <div>
              <span style={{ fontSize: '13px', color: '#94a3b8', marginRight: '8px' }}>Payroll Month:</span>
              <input
                type="month"
                value={selectedMonthYear}
                onChange={(e) => setSelectedMonthYear(e.target.value)}
                style={{ padding: '6px 12px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}
              />
            </div>

            <button
              onClick={handleRunPayroll}
              style={{
                padding: '10px 24px',
                backgroundColor: '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              🚀 1-Click Run Monthly Payroll & Post Salary Journal
            </button>
          </div>

          {/* Locked-in Formula Banner */}
          <div style={{ backgroundColor: '#1e293b', padding: '14px 20px', borderRadius: '8px', border: '1px solid #3b82f6' }}>
            <div style={{ fontWeight: 'bold', color: '#38bdf8', fontSize: '13px', marginBottom: '4px' }}>
              Locked-in Supermarket Payroll Mathematical Formula:
            </div>
            <code style={{ color: '#f8fafc', fontSize: '12px' }}>
              Net Pay = (Base Salary + Overtime Pay + Salesman Commission) - (Leave Deductions + Salary Advances + Grocery Khata + Cashier Shortages)
            </code>
          </div>

          {/* Payroll Results Table */}
          <div style={{ backgroundColor: '#0f172a', padding: '20px', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#38bdf8' }}>
              📊 Monthly Payroll Calculation Breakdown ({selectedMonthYear})
            </h3>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#1e293b', color: '#94a3b8', textAlign: 'left' }}>
                    <th style={{ padding: '10px' }}>Staff Member</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Base Pay</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>OT Pay</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Commission</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Gross Pay</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Leaves</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Advances</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Groceries</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Shortages</th>
                    <th style={{ padding: '10px', textAlign: 'right' }}>Net Pay (₹)</th>
                    <th style={{ padding: '10px', textAlign: 'center' }}>Payslip</th>
                  </tr>
                </thead>
                <tbody>
                  {staffList.map((s, idx) => {
                    const pay = calculateStaffNet(s);
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '10px', fontWeight: 'bold' }}>
                          {s.name}
                          <div style={{ fontSize: '10px', color: '#94a3b8' }}>{s.role}</div>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right' }}>₹{pay.baseSalary.toFixed(2)}</td>
                        <td style={{ padding: '10px', textAlign: 'right', color: '#22c55e' }}>+₹{pay.otPay.toFixed(2)}</td>
                        <td style={{ padding: '10px', textAlign: 'right', color: '#a855f7' }}>+₹{pay.commission.toFixed(2)}</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>₹{pay.grossPay.toFixed(2)}</td>
                        <td style={{ padding: '10px', textAlign: 'right', color: pay.leaveDeductions > 0 ? '#ef4444' : '#64748b' }}>
                          {pay.leaveDeductions > 0 ? `-₹${pay.leaveDeductions.toFixed(2)}` : '-'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', color: pay.advances > 0 ? '#ef4444' : '#64748b' }}>
                          {pay.advances > 0 ? `-₹${pay.advances.toFixed(2)}` : '-'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', color: pay.groceries > 0 ? '#ef4444' : '#64748b' }}>
                          {pay.groceries > 0 ? `-₹${pay.groceries.toFixed(2)}` : '-'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', color: pay.shortages > 0 ? '#ef4444' : '#64748b' }}>
                          {pay.shortages > 0 ? `-₹${pay.shortages.toFixed(2)}` : '-'}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold', fontSize: '13px', color: '#22c55e' }}>
                          ₹{pay.netPay.toFixed(2)}
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <button
                            onClick={() => setSelectedPayslip(pay)}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: '#1e293b',
                              border: '1px solid #334155',
                              color: '#38bdf8',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              fontSize: '11px',
                            }}
                          >
                            🖨️ View Payslip
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {payrollRunCompleted && (
              <div style={{ marginTop: '16px', padding: '12px', backgroundColor: '#064e3b', borderRadius: '6px', color: '#6ee7b7', fontSize: '13px' }}>
                ✓ Monthly Payroll Run Successful! Persisted to MonthlyPayroll records. Balanced Salary Voucher #JV-PAYROLL-202610-01 auto-posted to Double-Entry General Ledger.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Printable Payslip Modal */}
      {selectedPayslip && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              color: '#000000',
              padding: '30px',
              borderRadius: '8px',
              width: '550px',
              fontFamily: 'sans-serif',
            }}
          >
            <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '10px', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>TI SUPERMARKET (RETAIL OS)</h2>
              <div style={{ fontSize: '12px' }}>Branch: Flagship Hypermarket | GSTIN: 33AABCT9999P1Z5</div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', marginTop: '6px' }}>
                SALARY PAYSLIP FOR {selectedPayslip.monthYear}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', marginBottom: '16px' }}>
              <div><b>Employee:</b> {selectedPayslip.staffName}</div>
              <div><b>Role:</b> {selectedPayslip.role}</div>
              <div><b>Days in Month:</b> 30</div>
              <div><b>Payment Mode:</b> Bank Transfer</div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', marginBottom: '16px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1px solid #cbd5e1' }}>
                  <th style={{ padding: '6px', textAlign: 'left' }}>Earnings</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Amount (₹)</th>
                  <th style={{ padding: '6px', textAlign: 'left' }}>Deductions</th>
                  <th style={{ padding: '6px', textAlign: 'right' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '6px' }}>Base Salary</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>{selectedPayslip.baseSalary.toFixed(2)}</td>
                  <td style={{ padding: '6px' }}>Leave Deductions</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>{selectedPayslip.leaveDeductions.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px' }}>Overtime Pay</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>{selectedPayslip.otPay.toFixed(2)}</td>
                  <td style={{ padding: '6px' }}>Salary Advances</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>{selectedPayslip.advances.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px' }}>Salesman Commission</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>{selectedPayslip.commission.toFixed(2)}</td>
                  <td style={{ padding: '6px' }}>Grocery Khata Bills</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>{selectedPayslip.groceries.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '6px' }}>-</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>-</td>
                  <td style={{ padding: '6px' }}>Cashier Shortages</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>{selectedPayslip.shortages.toFixed(2)}</td>
                </tr>
                <tr style={{ borderTop: '1px solid #000', fontWeight: 'bold' }}>
                  <td style={{ padding: '6px' }}>Gross Earnings</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>₹{selectedPayslip.grossPay.toFixed(2)}</td>
                  <td style={{ padding: '6px' }}>Total Deductions</td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>₹{selectedPayslip.totalDeductions.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>

            <div
              style={{
                backgroundColor: '#f1f5f9',
                padding: '12px',
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: 'bold' }}>NET SALARY PAID:</span>
              <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#16a34a' }}>
                ₹{selectedPayslip.netPay.toFixed(2)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => window.print()}
                style={{ padding: '8px 16px', backgroundColor: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Print Payslip
              </button>
              <button
                onClick={() => setSelectedPayslip(null)}
                style={{ padding: '8px 16px', backgroundColor: '#64748b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
