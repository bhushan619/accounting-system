import React, { useState, useEffect } from "react";
import axios from "axios";
import { Trash2, Plus, X, Eye, Mail, Loader2, Edit, Upload, Download, FileSpreadsheet, Check, XCircle, RotateCcw } from "lucide-react";
import emailjs from "@emailjs/browser";
import * as XLSX from "xlsx";
import { useLanguage } from "../contexts/LanguageContext";
import { useAuth } from "../contexts/AuthContext";
import { usePreventSwipe } from "../hooks/usePreventSwipe";

interface PayrollRun {
  _id: string;
  runNumber: string;
  month: number;
  year: number;
  status: string;
  totalEmployees: number;
  totalGrossSalary: number;
  totalNetSalary: number;
  totalDeductions: number;
  totalCTC?: number;
  createdAt: string;
  payrollEntries?: any[];
  rejectionReason?: string;
  submittedBy?: { email: string };
  approvedBy?: { email: string };
  rejectedBy?: { email: string };
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
}

interface Employee {
  _id: string;
  employeeId: string;
  fullName: string;
  email: string;
  basicSalary: number;
  transportAllowance: number;
  performanceSalaryProbation?: number;
  performanceSalaryConfirmed?: number;
  status: string;
}

interface AttendanceData {
  employeeId: string;
  workingDays: number;
  attendedDays: number;
  absentDays: number;
  sickLeave: number;
  casualLeave: number;
  annualLeave: number;
  unpaidLeave: number;
  otherLeave: number;
  leaveNotes: string;
  attendanceDeduction?: number;
}

interface AttendanceHistory {
  _id: string;
  employee: { _id: string; employeeId: string; fullName: string; basicSalary: number };
  month: number;
  year: number;
  workingDays: number;
  attendedDays: number;
  absentDays: number;
  sickLeave: number;
  casualLeave: number;
  annualLeave: number;
  unpaidLeave: number;
  otherLeave: number;
  leaveNotes: string;
  attendanceDeduction: number;
}

interface AttendanceWarning {
  type: "missing" | "extra" | "invalid";
  employeeId: string;
  employeeName?: string;
  message: string;
}

interface PayrollPreview {
  employee: Employee;
  basicSalary: number;
  performanceSalary: number;
  transportAllowance: number;
  deductionAmount: number;
  deductionReason: string;
  attendedDays: number;
  absentDays: number;
  sickLeave: number;
  casualLeave: number;
  annualLeave: number;
  unpaidLeave: number;
  otherLeave: number;
  leaveNotes: string;
  attendanceDeduction: number;
  grossSalary: number;
  epfEmployee: number;
  epfEmployer: number;
  etf: number;
  apit: number;
  stampFee: number;
  totalDeductions: number;
  netSalary: number;
  totalCTC: number;
  workingDays: number;
  deficitSalary: number;
  includeDeficitInPayroll: boolean;
}

interface EditEntry {
  _id: string;
  serialNumber: string;
  employee: any;
  basicSalary: number;
  performanceSalary: number;
  transportAllowance: number;
  deductionAmount: number;
  deductionReason: string;
  deficitSalary: number;
  includeDeficitInPayroll: boolean;
  grossSalary: number;
  epfEmployee: number;
  epfEmployer: number;
  etf: number;
  apit: number;
  stampFee: number;
  totalDeductions: number;
  netSalary: number;
  totalCTC: number;
}

// EmailJS Configuration - loads from environment variables with fallbacks
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// Get total calendar days in a month
const getCalendarDaysInMonth = (month: number, year: number): number => {
  return new Date(year, month, 0).getDate();
};

export default function Payroll() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEmailConfirm, setShowEmailConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [pendingRejectId, setPendingRejectId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [editData, setEditData] = useState<EditEntry[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [pendingProcess, setPendingProcess] = useState<{ id: string; totalAmount: number } | null>(null);
  const [selectedBank, setSelectedBank] = useState("");
  const [previewData, setPreviewData] = useState<PayrollPreview[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [taxRates, setTaxRates] = useState<any>(null);
  const [sendingEmails, setSendingEmails] = useState(false);
  const [emailConfig, setEmailConfig] = useState({
    serviceId: EMAILJS_SERVICE_ID,
    templateId: EMAILJS_TEMPLATE_ID,
    publicKey: EMAILJS_PUBLIC_KEY,
  });
  const [formData, setFormData] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([]);
  const [attendanceFile, setAttendanceFile] = useState<File | null>(null);
  const [workingDaysInMonth, setWorkingDaysInMonth] = useState(() => getCalendarDaysInMonth(new Date().getMonth() + 1, new Date().getFullYear()));
  const [attendanceWarnings, setAttendanceWarnings] = useState<AttendanceWarning[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [viewAttendanceData, setViewAttendanceData] = useState<AttendanceHistory[]>([]);

  // Disable swipe gestures when any modal is open
  usePreventSwipe(showModal || showPreview || showBankModal || showViewModal || showEmailModal || showEditModal || showEmailConfirm || showRejectModal);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [runsRes, employeesRes, banksRes, taxRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL}/payrollruns`),
        axios.get(`${import.meta.env.VITE_API_URL}/employees`),
        axios.get(`${import.meta.env.VITE_API_URL}/banks`),
        axios.get(`${import.meta.env.VITE_API_URL}/taxconfig`),
      ]);
      setRuns(runsRes.data);
      setEmployees(employeesRes.data.filter((e: Employee) => e.status !== "closed"));
      setBanks(banksRes.data);

      // Extract tax rates from tax config
      const rates = {
        epfEmployee: 8,
        epfEmployer: 12,
        etf: 3,
        stampFee: 25,
      };

      taxRes.data.forEach((config: any) => {
        if (config.taxType === "epf_employee" && config.isActive) rates.epfEmployee = config.rate;
        if (config.taxType === "epf_employer" && config.isActive) rates.epfEmployer = config.rate;
        if (config.taxType === "etf" && config.isActive) rates.etf = config.rate;
        if (config.taxType === "stamp_fee" && config.isActive) rates.stampFee = config.rate;
      });

      setTaxRates(rates);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAPIT = (grossSalary: number, scenario: string = "employee"): number => {
    const employeeSlabs = [
      { minIncome: 0, maxIncome: 150000, rate: 0, standardDeduction: 0 },
      { minIncome: 150001, maxIncome: 233333, rate: 6, standardDeduction: 9000 },
      { minIncome: 233334, maxIncome: 275000, rate: 18, standardDeduction: 37000 },
      { minIncome: 275001, maxIncome: 316667, rate: 24, standardDeduction: 53500 },
      { minIncome: 316668, maxIncome: 358333, rate: 30, standardDeduction: 72500 },
      { minIncome: 358334, maxIncome: null, rate: 36, standardDeduction: 94000 },
    ];

    const employerSlabs = [
      { minIncome: 0, maxIncome: 150000, rate: 0, standardDeduction: 0 },
      { minIncome: 150001, maxIncome: 228333, rate: 6.38, standardDeduction: 9570 },
      { minIncome: 228334, maxIncome: 262500, rate: 21.95, standardDeduction: 45119 },
      { minIncome: 262501, maxIncome: 294167, rate: 32.56, standardDeduction: 73000 },
      { minIncome: 294168, maxIncome: 323333, rate: 42.86, standardDeduction: 103580 },
      { minIncome: 323334, maxIncome: null, rate: 56.25, standardDeduction: 146875 },
    ];

    const slabs = scenario === "employee" ? employeeSlabs : employerSlabs;
    let applicableSlab = slabs[0];

    for (const slab of slabs) {
      if (grossSalary >= slab.minIncome) {
        if (slab.maxIncome === null || grossSalary <= slab.maxIncome) {
          applicableSlab = slab;
          break;
        }
      }
    }

    const apit = (grossSalary * applicableSlab.rate) / 100 - applicableSlab.standardDeduction;
    return Math.max(0, Math.round(apit * 100) / 100);
  };

  const downloadAttendanceTemplate = () => {
    // Create sample data with all active employees including leave types
    const templateData = employees.map((emp) => ({
      "Employee ID": emp.employeeId,
      "Employee Name": emp.fullName,
      "Working Days": workingDaysInMonth,
      "Attended Days": workingDaysInMonth,
      "Sick Leave": 0,
      "Casual Leave": 0,
      "Annual Leave": 0,
      "Unpaid Leave": 0,
      "Other Leave": 0,
      "Leave Notes": "",
    }));

    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    ws["!cols"] = [
      { wch: 15 }, // Employee ID
      { wch: 30 }, // Employee Name
      { wch: 15 }, // Working Days
      { wch: 15 }, // Attended Days
      { wch: 12 }, // Sick Leave
      { wch: 12 }, // Casual Leave
      { wch: 12 }, // Annual Leave
      { wch: 12 }, // Unpaid Leave
      { wch: 12 }, // Other Leave
      { wch: 25 }, // Leave Notes
    ];

    // Add instructions sheet
    const noteSheet = XLSX.utils.aoa_to_sheet([
      ["Instructions:"],
      [""],
      ["1. Fill in 'Attended Days' for each employee"],
      ["2. Half-days are supported (e.g., 21.5 for 21 full days + 1 half day)"],
      ["3. Do not modify Employee ID column"],
      ["4. Working Days can be adjusted if needed"],
      [""],
      ["Leave Types:"],
      ["- Sick Leave: Days taken due to illness (typically paid)"],
      ["- Casual Leave: Short-notice personal leave (typically paid)"],
      ["- Annual Leave: Planned vacation/holiday leave (paid)"],
      ["- Unpaid Leave: Leave without pay (deducted from salary)"],
      ["- Other Leave: Any other type of leave"],
      [""],
      ["Notes:"],
      ["- Only 'Unpaid Leave' will be deducted from salary"],
      ["- Other leave types are for tracking purposes"],
      ["- Leave Notes: Optional comments for any leave"],
    ]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance");
    XLSX.utils.book_append_sheet(wb, noteSheet, "Instructions");

    const fileName = `Attendance_Template_${getMonthName(formData.month)}_${formData.year}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const handleAttendanceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAttendanceFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const warnings: AttendanceWarning[] = [];
        const parsedAttendance: AttendanceData[] = [];
        const uploadedEmployeeIds = new Set<string>();

        jsonData.forEach((row: any) => {
          const employeeId = String(row["Employee ID"] || "").trim();
          if (!employeeId) return;

          uploadedEmployeeIds.add(employeeId);
          const workingDays = Number(row["Working Days"]) || workingDaysInMonth;
          // Support half-day attendance (e.g., 21.5)
          const attendedDays = parseFloat(String(row["Attended Days"])) || 0;
          
          // Parse leave types (all support half-days)
          const sickLeave = parseFloat(String(row["Sick Leave"])) || 0;
          const casualLeave = parseFloat(String(row["Casual Leave"])) || 0;
          const annualLeave = parseFloat(String(row["Annual Leave"])) || 0;
          const unpaidLeave = parseFloat(String(row["Unpaid Leave"])) || 0;
          const otherLeave = parseFloat(String(row["Other Leave"])) || 0;
          const leaveNotes = String(row["Leave Notes"] || "").trim();

          // Get calendar days limit for the selected month
          const calendarDays = getCalendarDaysInMonth(formData.month, formData.year);
          
          // Validate attended days
          if (attendedDays < 0) {
            warnings.push({
              type: "invalid",
              employeeId,
              message: `${employeeId}: Attended days cannot be negative`,
            });
          }
          if (attendedDays > calendarDays) {
            warnings.push({
              type: "invalid",
              employeeId,
              message: `${employeeId}: Attended days (${attendedDays}) exceeds calendar days in month (${calendarDays})`,
            });
          }
          if (attendedDays > workingDays) {
            warnings.push({
              type: "invalid",
              employeeId,
              message: `${employeeId}: Attended days (${attendedDays}) exceeds working days (${workingDays})`,
            });
          }

          // Validate leave types are not negative
          const leaveTypes = { sickLeave, casualLeave, annualLeave, unpaidLeave, otherLeave };
          Object.entries(leaveTypes).forEach(([type, value]) => {
            if (value < 0) {
              warnings.push({
                type: "invalid",
                employeeId,
                message: `${employeeId}: ${type} cannot be negative`,
              });
            }
          });

          // Calculate total leave days
          const totalLeave = sickLeave + casualLeave + annualLeave + unpaidLeave + otherLeave;
          const calculatedAbsentDays = workingDays - attendedDays;
          
          // Warn if leave days don't match absent days
          if (totalLeave > 0 && Math.abs(totalLeave - calculatedAbsentDays) > 0.5) {
            warnings.push({
              type: "invalid",
              employeeId,
              message: `${employeeId}: Total leave (${totalLeave}) doesn't match absent days (${calculatedAbsentDays.toFixed(1)})`,
            });
          }

          parsedAttendance.push({
            employeeId,
            workingDays,
            attendedDays: Math.max(0, attendedDays),
            absentDays: Math.max(0, workingDays - attendedDays),
            sickLeave: Math.max(0, sickLeave),
            casualLeave: Math.max(0, casualLeave),
            annualLeave: Math.max(0, annualLeave),
            unpaidLeave: Math.max(0, unpaidLeave),
            otherLeave: Math.max(0, otherLeave),
            leaveNotes,
          });
        });

        // Check for employees not in attendance file
        const selectedEmps = employees.filter((e) => selectedEmployees.includes(e._id));
        selectedEmps.forEach((emp) => {
          if (!uploadedEmployeeIds.has(emp.employeeId)) {
            warnings.push({
              type: "missing",
              employeeId: emp.employeeId,
              employeeName: emp.fullName,
              message: `${emp.employeeId} (${emp.fullName}): Missing attendance data`,
            });
          }
        });

        // Check for extra employees in attendance file (not selected for payroll)
        const activeEmployeeIds = new Set(employees.map((e) => e.employeeId));
        uploadedEmployeeIds.forEach((empId) => {
          if (!activeEmployeeIds.has(empId)) {
            warnings.push({
              type: "extra",
              employeeId: empId,
              message: `${empId}: Employee not found in system`,
            });
          }
        });

        setAttendanceData(parsedAttendance);
        setAttendanceWarnings(warnings);
      } catch (error) {
        console.error("Failed to parse attendance file:", error);
        alert("Failed to parse the attendance file. Please ensure it follows the template format.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Revalidate attendance warnings when selected employees change
  const validateAttendanceForSelectedEmployees = () => {
    if (attendanceData.length === 0) return;

    const warnings: AttendanceWarning[] = [];
    const uploadedEmployeeIds = new Set(attendanceData.map((a) => a.employeeId));

    // Check for missing attendance data for selected employees
    const selectedEmps = employees.filter((e) => selectedEmployees.includes(e._id));
    selectedEmps.forEach((emp) => {
      if (!uploadedEmployeeIds.has(emp.employeeId)) {
        warnings.push({
          type: "missing",
          employeeId: emp.employeeId,
          employeeName: emp.fullName,
          message: `${emp.employeeId} (${emp.fullName}): Missing attendance data`,
        });
      }
    });

    setAttendanceWarnings(warnings);
  };

  // Fetch attendance history when month/year changes
  const fetchAttendanceHistory = async (month: number, year: number) => {
    setLoadingHistory(true);
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/attendance/month/${year}/${month}`);
      setAttendanceHistory(response.data);
    } catch (error) {
      console.error("Failed to fetch attendance history:", error);
      setAttendanceHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getAttendanceForEmployee = (employeeId: string): AttendanceData | undefined => {
    return attendanceData.find((a) => a.employeeId === employeeId);
  };

  const recalculatePayroll = (
    entry: PayrollPreview,
    newPerformanceSalary: number,
    newTransportAllowance: number,
    newDeductionAmount: number = entry.deductionAmount,
    newDeductionReason: string = entry.deductionReason,
    newAttendedDays: number = entry.attendedDays,
    newAbsentDays: number = entry.absentDays,
    newIncludeDeficit: boolean = entry.includeDeficitInPayroll,
  ): PayrollPreview => {
    if (!taxRates) return entry;

    const basicSalary = entry.basicSalary;
    const performanceSalary = newPerformanceSalary;
    const transportAllowance = newTransportAllowance;
    const deductionAmount = newDeductionAmount;
    const deductionReason = newDeductionReason;
    const attendedDays = newAttendedDays;
    const absentDays = newAbsentDays;
    const workingDays = entry.workingDays || workingDaysInMonth;
    const deficitSalary = entry.deficitSalary || 0;
    const includeDeficitInPayroll = newIncludeDeficit;

    // Calculate attendance deduction based on unpaid leave only
    // Note: Performance salary is already calculated per-day on backend based on probation dates
    const perDaySalary = (basicSalary + performanceSalary + transportAllowance) / workingDays;
    const unpaidLeave = entry.unpaidLeave || 0;
    const attendanceDeduction = Math.round(perDaySalary * unpaidLeave * 100) / 100;

    // Include deficit salary if checkbox is checked
    const deficitAmount = includeDeficitInPayroll ? deficitSalary : 0;
    const grossSalary = basicSalary + performanceSalary + transportAllowance + deficitAmount;

    // EPF and ETF calculated on (Basic + Performance Salary)
    const epfEtfBase = basicSalary + performanceSalary;
    const epfEmployee = Math.round(((epfEtfBase * taxRates.epfEmployee) / 100) * 100) / 100;
    const epfEmployer = Math.round(((epfEtfBase * taxRates.epfEmployer) / 100) * 100) / 100;
    const etf = Math.round(((epfEtfBase * taxRates.etf) / 100) * 100) / 100;
    const stampFee = taxRates.stampFee;

    // Scenario A only - employee pays APIT
    const apit = calculateAPIT(grossSalary, "employee");

    // Total deductions include EPF, APIT, stamp, other deductions, and attendance deduction
    const deductions = epfEmployee + apit + stampFee + deductionAmount + attendanceDeduction;
    const netSalary = grossSalary - deductions;
    const ctc = grossSalary + epfEmployer + etf;

    return {
      ...entry,
      performanceSalary,
      transportAllowance,
      deductionAmount,
      deductionReason,
      attendedDays,
      absentDays,
      attendanceDeduction,
      grossSalary,
      epfEmployee,
      epfEmployer,
      etf,
      apit,
      stampFee,
      totalDeductions: deductions,
      netSalary,
      totalCTC: ctc,
      includeDeficitInPayroll,
    };
  };

  const handlePerformanceSalaryChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const updatedPreview = [...previewData];
    updatedPreview[index] = recalculatePayroll(
      updatedPreview[index],
      numValue,
      updatedPreview[index].transportAllowance,
      updatedPreview[index].deductionAmount,
      updatedPreview[index].deductionReason,
      updatedPreview[index].attendedDays,
      updatedPreview[index].absentDays,
    );
    setPreviewData(updatedPreview);
  };

  const handleTransportAllowanceChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const updatedPreview = [...previewData];
    updatedPreview[index] = recalculatePayroll(
      updatedPreview[index],
      updatedPreview[index].performanceSalary,
      numValue,
      updatedPreview[index].deductionAmount,
      updatedPreview[index].deductionReason,
      updatedPreview[index].attendedDays,
      updatedPreview[index].absentDays,
    );
    setPreviewData(updatedPreview);
  };

  const handleDeductionAmountChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const updatedPreview = [...previewData];
    updatedPreview[index] = recalculatePayroll(
      updatedPreview[index],
      updatedPreview[index].performanceSalary,
      updatedPreview[index].transportAllowance,
      numValue,
      updatedPreview[index].deductionReason,
      updatedPreview[index].attendedDays,
      updatedPreview[index].absentDays,
    );
    setPreviewData(updatedPreview);
  };

  const handleDeductionReasonChange = (index: number, value: string) => {
    const updatedPreview = [...previewData];
    updatedPreview[index] = {
      ...updatedPreview[index],
      deductionReason: value,
    };
    setPreviewData(updatedPreview);
  };

  const handleDeficitToggle = (index: number, checked: boolean) => {
    const updatedPreview = [...previewData];
    updatedPreview[index] = recalculatePayroll(
      updatedPreview[index],
      updatedPreview[index].performanceSalary,
      updatedPreview[index].transportAllowance,
      updatedPreview[index].deductionAmount,
      updatedPreview[index].deductionReason,
      updatedPreview[index].attendedDays,
      updatedPreview[index].absentDays,
      checked,
    );
    setPreviewData(updatedPreview);
  };

  const handlePreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedEmployees.length === 0) {
      alert("Please select at least one employee");
      return;
    }

    if (attendanceData.length === 0) {
      alert("Please upload an attendance file before proceeding");
      return;
    }

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/payrollruns/preview`, {
        ...formData,
        employeeIds: selectedEmployees,
      });
      // Add deduction fields and attendance to preview data
      const dataWithExtras = response.data.map((entry: PayrollPreview) => {
        const attendance = getAttendanceForEmployee(entry.employee.employeeId);
        const attendedDays = attendance?.attendedDays ?? entry.workingDays;
        const absentDays = attendance?.absentDays ?? 0;
        const grossSalary = entry.basicSalary + entry.performanceSalary + entry.transportAllowance;
        const perDaySalary = grossSalary / entry.workingDays;
        // Only unpaid leave causes deduction
        const unpaidLeave = attendance?.unpaidLeave ?? 0;
        const attendanceDeduction = Math.round(perDaySalary * unpaidLeave * 100) / 100;

        return {
          ...entry,
          deductionAmount: 0,
          deductionReason: "",
          attendedDays,
          absentDays,
          sickLeave: attendance?.sickLeave ?? 0,
          casualLeave: attendance?.casualLeave ?? 0,
          annualLeave: attendance?.annualLeave ?? 0,
          unpaidLeave,
          otherLeave: attendance?.otherLeave ?? 0,
          leaveNotes: attendance?.leaveNotes ?? "",
          attendanceDeduction,
        };
      });

      // Recalculate with attendance deductions
      const recalculatedData = dataWithExtras.map((entry: PayrollPreview) =>
        recalculatePayroll(
          entry,
          entry.performanceSalary,
          entry.transportAllowance,
          entry.deductionAmount,
          entry.deductionReason,
          entry.attendedDays,
          entry.absentDays,
        ),
      );

      setPreviewData(recalculatedData);
      setShowPreview(true);
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to preview payroll");
    }
  };

  const handleGenerate = async () => {
    try {
      // Send preview data with performance salary, transport allowance, deductions, attendance, and deficit
      const employeeData = previewData.map((entry) => ({
        employeeId: entry.employee._id,
        performanceSalary: entry.performanceSalary,
        transportAllowance: entry.transportAllowance,
        deductionAmount: entry.deductionAmount + entry.attendanceDeduction,
        deductionReason: entry.deductionReason
          ? `${entry.deductionReason}${entry.unpaidLeave > 0 ? `, Unpaid Leave ${entry.unpaidLeave} days` : ""}`
          : entry.unpaidLeave > 0
            ? `Unpaid Leave ${entry.unpaidLeave} days`
            : "",
        deficitSalary: entry.deficitSalary || 0,
        includeDeficitInPayroll: entry.includeDeficitInPayroll || false,
      }));

      const runResponse = await axios.post(`${import.meta.env.VITE_API_URL}/payrollruns/generate`, {
        ...formData,
        employeeIds: selectedEmployees,
        employeeData,
      });

      // Save attendance data to backend with leave types
      const attendanceToSave = previewData.map((entry) => ({
        employeeId: entry.employee.employeeId,
        workingDays: workingDaysInMonth,
        attendedDays: entry.attendedDays,
        absentDays: entry.absentDays,
        sickLeave: entry.sickLeave,
        casualLeave: entry.casualLeave,
        annualLeave: entry.annualLeave,
        unpaidLeave: entry.unpaidLeave,
        otherLeave: entry.otherLeave,
        leaveNotes: entry.leaveNotes,
        attendanceDeduction: entry.attendanceDeduction,
      }));

      try {
        await axios.post(`${import.meta.env.VITE_API_URL}/attendance/bulk`, {
          month: formData.month,
          year: formData.year,
          attendanceData: attendanceToSave,
          payrollRunId: runResponse.data._id,
        });
      } catch (attError) {
        console.error("Failed to save attendance data:", attError);
        // Non-blocking - payroll was still generated
      }

      loadData();
      resetForm();
      setShowPreview(false);
      setPreviewData([]);
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to generate payroll run");
    }
  };

  const handleProcess = async (id: string) => {
    const run = runs.find((r) => r._id === id);
    if (!run) return;

    // Show bank selection modal
    setPendingProcess({ id, totalAmount: run.totalNetSalary });
    setShowBankModal(true);
  };

  const handleViewDetails = async (id: string) => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/payrollruns/${id}`);
      const run = response.data;
      setSelectedRun(run);

      // Also fetch attendance data for this period
      try {
        const attendanceRes = await axios.get(
          `${import.meta.env.VITE_API_URL}/attendance/month/${run.year}/${run.month}`,
        );
        setViewAttendanceData(attendanceRes.data);
      } catch (attError) {
        console.error("Failed to fetch attendance:", attError);
        setViewAttendanceData([]);
      }

      setShowViewModal(true);
    } catch (error) {
      console.error("Failed to load run details:", error);
      alert("Failed to load payroll run details");
    }
  };

  const confirmProcess = async () => {
    if (!selectedBank || !pendingProcess) return;

    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/payrollruns/${pendingProcess.id}/process`, {
        bankId: selectedBank,
      });
      setShowBankModal(false);

      // After successful processing, ask if user wants to send emails
      const runDetails = await axios.get(`${import.meta.env.VITE_API_URL}/payrollruns/${pendingProcess.id}`);
      setSelectedRun(runDetails.data);
      setPendingProcess(null);
      setSelectedBank("");
      setShowEmailModal(true);

      loadData();
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to process payroll");
    }
  };

  const sendPayrollEmails = async () => {
    console.log("=== SEND PAYROLL EMAILS STARTED ===");
    console.log("selectedRun:", selectedRun);
    console.log("selectedRun.payrollEntries:", selectedRun?.payrollEntries);

    if (!selectedRun || !selectedRun.payrollEntries) {
      console.error("ABORT: No selectedRun or payrollEntries");
      return;
    }

    console.log("EmailJS Config Check:", {
      serviceId: emailConfig.serviceId,
      templateId: emailConfig.templateId,
      publicKey: emailConfig.publicKey,
      publicKeyLength: emailConfig.publicKey?.length,
    });

    if (!emailConfig.publicKey) {
      console.error("ABORT: No publicKey configured");
      alert("EmailJS is not configured. Please set up your EmailJS credentials in the environment variables.");
      return;
    }

    setSendingEmails(true);
    let successCount = 0;
    let failCount = 0;

    try {
      console.log("Initializing EmailJS with publicKey:", emailConfig.publicKey);
      emailjs.init(emailConfig.publicKey);
      console.log("EmailJS initialized successfully");

      const entries = selectedRun.payrollEntries as any[];
      console.log("Total entries to process:", entries.length);

      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        console.log(`Processing entry ${i + 1}/${entries.length}:`, entry);

        if (!entry.employee?.email) {
          console.warn(`Entry ${i + 1}: No employee email found`, entry.employee);
          failCount++;
          continue;
        }

        const templateParams = {
          to_email: entry.employee.email,
          EMPLOYEE_NAME: entry.employee.fullName,
          AMOUNT: entry.netSalary.toLocaleString(),
          PROCESSING_DATE: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" }),
          PERIOD_TEXT: `${getMonthName(selectedRun.month)} ${selectedRun.year}`,
        };

        console.log(`Entry ${i + 1}: Sending email to ${entry.employee.email}`);
        console.log(`Entry ${i + 1}: Template params:`, templateParams);

        try {
          console.log(`Entry ${i + 1}: Calling emailjs.send()...`);
          const response = await emailjs.send(emailConfig.serviceId, emailConfig.templateId, templateParams);
          console.log(`Entry ${i + 1}: Email sent successfully!`, response);
          successCount++;
        } catch (emailError: any) {
          console.error(`Entry ${i + 1}: FAILED to send email`);
          console.error("Error object:", emailError);
          console.error("Error text:", emailError?.text);
          console.error("Error message:", emailError?.message);
          console.error("Error status:", emailError?.status);
          failCount++;
        }
      }

      console.log(`=== EMAIL SENDING COMPLETE: ${successCount} success, ${failCount} failed ===`);
      alert(`Emails sent: ${successCount} successful, ${failCount} failed`);
      setShowEmailModal(false);
      setShowEmailConfirm(false);
      setSelectedRun(null);
    } catch (error: any) {
      console.error("=== CRITICAL ERROR IN sendPayrollEmails ===");
      console.error("Error object:", error);
      console.error("Error text:", error?.text);
      console.error("Error message:", error?.message);
      console.error("Error stack:", error?.stack);
      alert(`Failed to send emails: ${error?.text || error?.message || "Check console for details"}`);
    } finally {
      setSendingEmails(false);
      console.log("=== SEND PAYROLL EMAILS ENDED ===");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this payroll run and all associated entries?")) return;
    try {
      await axios.delete(`${import.meta.env.VITE_API_URL}/payrollruns/${id}`);
      loadData();
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const handleEditPayroll = async (id: string) => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/payrollruns/${id}`);
      const run = response.data;

      if (run.status !== "draft") {
        alert("Can only edit draft payroll runs");
        return;
      }

      setSelectedRun(run);
      setEditData(
        run.payrollEntries.map((entry: any) => ({
          _id: entry._id,
          serialNumber: entry.serialNumber,
          employee: entry.employee,
          basicSalary: entry.basicSalary,
          performanceSalary: entry.performanceSalary || 0,
          transportAllowance: entry.transportAllowance || 0,
          deductionAmount: entry.deductionAmount || 0,
          deductionReason: entry.deductionReason || "",
          deficitSalary: entry.deficitSalary || 0,
          includeDeficitInPayroll: entry.includeDeficitInPayroll || false,
          grossSalary: entry.grossSalary,
          epfEmployee: entry.epfEmployee,
          epfEmployer: entry.epfEmployer,
          etf: entry.etf,
          apit: entry.apit || 0,
          stampFee: entry.stampFee,
          totalDeductions: entry.totalDeductions,
          netSalary: entry.netSalary,
          totalCTC: entry.totalCTC,
        })),
      );
      setShowEditModal(true);
    } catch (error) {
      console.error("Failed to load payroll for editing:", error);
      alert("Failed to load payroll run details");
    }
  };

  const recalculateEditEntry = (entry: EditEntry, newPerformanceSalary: number, newTransportAllowance: number, newDeductionAmount: number, newIncludeDeficit?: boolean): EditEntry => {
    if (!taxRates) return entry;

    const basicSalary = entry.basicSalary;
    const performanceSalary = newPerformanceSalary;
    const transportAllowance = newTransportAllowance;
    const deductionAmount = newDeductionAmount;
    const deficitSalary = entry.deficitSalary;
    const includeDeficitInPayroll = newIncludeDeficit !== undefined ? newIncludeDeficit : entry.includeDeficitInPayroll;
    
    // Include deficit in gross if enabled
    const deficitToInclude = includeDeficitInPayroll ? deficitSalary : 0;
    const grossSalary = basicSalary + performanceSalary + transportAllowance + deficitToInclude;

    // EPF and ETF calculated on (Basic + Performance Salary)
    const epfEtfBase = basicSalary + performanceSalary;
    const epfEmployee = Math.round(((epfEtfBase * taxRates.epfEmployee) / 100) * 100) / 100;
    const epfEmployer = Math.round(((epfEtfBase * taxRates.epfEmployer) / 100) * 100) / 100;
    const etf = Math.round(((epfEtfBase * taxRates.etf) / 100) * 100) / 100;
    const stampFee = taxRates.stampFee;

    // Scenario A only - employee pays APIT
    const apit = calculateAPIT(grossSalary, "employee");

    const deductions = epfEmployee + apit + stampFee + deductionAmount;
    const netSalary = grossSalary - deductions;
    const ctc = grossSalary + epfEmployer + etf;

    return {
      ...entry,
      performanceSalary,
      transportAllowance,
      deductionAmount,
      deficitSalary,
      includeDeficitInPayroll,
      grossSalary,
      epfEmployee,
      epfEmployer,
      etf,
      apit,
      stampFee,
      totalDeductions: deductions,
      netSalary,
      totalCTC: ctc,
    };
  };

  const handleEditDeficitToggle = (index: number, checked: boolean) => {
    const updatedData = [...editData];
    updatedData[index] = recalculateEditEntry(
      updatedData[index],
      updatedData[index].performanceSalary,
      updatedData[index].transportAllowance,
      updatedData[index].deductionAmount,
      checked
    );
    setEditData(updatedData);
  };

  const handleEditPerformanceSalaryChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const updatedData = [...editData];
    updatedData[index] = recalculateEditEntry(updatedData[index], numValue, updatedData[index].transportAllowance, updatedData[index].deductionAmount);
    setEditData(updatedData);
  };

  const handleEditTransportAllowanceChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const updatedData = [...editData];
    updatedData[index] = recalculateEditEntry(updatedData[index], updatedData[index].performanceSalary, numValue, updatedData[index].deductionAmount);
    setEditData(updatedData);
  };

  const handleEditDeductionAmountChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const updatedData = [...editData];
    updatedData[index] = recalculateEditEntry(updatedData[index], updatedData[index].performanceSalary, updatedData[index].transportAllowance, numValue);
    setEditData(updatedData);
  };

  const handleEditDeductionReasonChange = (index: number, value: string) => {
    const updatedData = [...editData];
    updatedData[index] = { ...updatedData[index], deductionReason: value };
    setEditData(updatedData);
  };

  const handleSaveEdit = async () => {
    if (!selectedRun) return;

    setSavingEdit(true);
    try {
      const entries = editData.map((entry) => ({
        _id: entry._id,
        performanceSalary: entry.performanceSalary,
        transportAllowance: entry.transportAllowance,
        deductionAmount: entry.deductionAmount,
        deductionReason: entry.deductionReason,
        deficitSalary: entry.deficitSalary,
        includeDeficitInPayroll: entry.includeDeficitInPayroll,
      }));

      await axios.put(`${import.meta.env.VITE_API_URL}/payrollruns/${selectedRun._id}/entries`, { entries });

      setShowEditModal(false);
      setSelectedRun(null);
      setEditData([]);
      loadData();
      alert("Payroll run updated successfully");
    } catch (error: any) {
      console.error("Failed to save edit:", error);
      alert(error.response?.data?.error || "Failed to save changes");
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleEmployee = (id: string) => {
    setSelectedEmployees((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));
  };

  const selectAll = () => {
    const filtered = employees.filter(
      (emp) =>
        emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    setSelectedEmployees(filtered.map((e) => e._id));
  };

  const deselectAll = () => {
    setSelectedEmployees([]);
  };

  const resetForm = () => {
    setFormData({
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear(),
    });
    setSelectedEmployees([]);
    setSearchQuery("");
    setShowModal(false);
    setShowPreview(false);
    setPreviewData([]);
    setAttendanceData([]);
    setAttendanceFile(null);
    setAttendanceWarnings([]);
    setAttendanceHistory([]);
  };

  // Fetch attendance history when modal opens or month/year changes
  useEffect(() => {
    if (showModal) {
      fetchAttendanceHistory(formData.month, formData.year);
    }
  }, [showModal, formData.month, formData.year]);

  // Revalidate warnings when selected employees change
  useEffect(() => {
    if (attendanceData.length > 0 && selectedEmployees.length > 0) {
      validateAttendanceForSelectedEmployees();
    }
  }, [selectedEmployees, attendanceData]);

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1).toLocaleString("default", { month: "long" });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "paid":
        return "bg-purple-100 text-purple-800";
      case "pending_approval":
        return "bg-amber-100 text-amber-800";
      case "approved":
        return "bg-emerald-100 text-emerald-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending_approval":
        return "Pending Approval";
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  // Approval workflow functions
  const handleSubmitForApproval = async (id: string) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/payrollruns/${id}/submit`);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to submit payroll");
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/payrollruns/${id}/approve`);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to approve payroll");
    }
  };

  const openRejectModal = (id: string) => {
    setPendingRejectId(id);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const handleReject = async () => {
    if (!pendingRejectId) return;
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/payrollruns/${pendingRejectId}/reject`, {
        reason: rejectReason,
      });
      setShowRejectModal(false);
      setPendingRejectId(null);
      setRejectReason("");
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to reject payroll");
    }
  };

  const handleRevert = async (id: string) => {
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/payrollruns/${id}/revert`);
      loadData();
    } catch (error: any) {
      alert(error.response?.data?.error || "Failed to revert payroll");
    }
  };

  const filteredEmployees = employees.filter(
    (emp) =>
      emp.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeId.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (loading) return <div className="text-center py-8">{t("common.loading")}</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("payroll.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t("payroll.description")}</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
        >
          <Plus size={20} />
          {t("payroll.generatePayroll")}
        </button>
      </div>

      {/* Payroll Runs Table */}
      <div className="bg-card rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">{t("payroll.payrollRuns")}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  {t("payroll.runNumber")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  {t("payroll.period")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  {t("employees.title")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  {t("payroll.grossSalary")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  {t("payroll.deductions")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  {t("payroll.netSalary")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-muted-foreground">
                    No payroll runs yet. Click "Generate Payroll" to create your first run.
                  </td>
                </tr>
              ) : (
                runs.map((run) => (
                  <tr key={run._id} className="hover:bg-accent/50">
                    <td className="px-6 py-4 text-sm font-medium text-foreground">{run.runNumber}</td>
                    <td className="px-6 py-4 text-sm text-foreground">
                      {getMonthName(run.month)} {run.year}
                    </td>
                    <td className="px-6 py-4 text-sm text-foreground">{run.totalEmployees}</td>
                    <td className="px-6 py-4 text-sm text-foreground">Rs. {run.totalGrossSalary.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-destructive">Rs. {run.totalDeductions.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-foreground">
                      Rs. {run.totalNetSalary.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className={`px-2 py-1 text-xs rounded-full w-fit ${getStatusColor(run.status)}`}>
                          {getStatusLabel(run.status)}
                        </span>
                        {run.status === "rejected" && run.rejectionReason && (
                          <span className="text-xs text-red-600" title={run.rejectionReason}>
                            Reason: {run.rejectionReason.length > 30 ? run.rejectionReason.substring(0, 30) + "..." : run.rejectionReason}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 flex-wrap">
                        <button
                          onClick={() => handleViewDetails(run._id)}
                          className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 flex items-center gap-1"
                        >
                          <Eye size={14} />
                          View
                        </button>
                        
                        {/* Edit - only for draft */}
                        {run.status === "draft" && (
                          <button
                            onClick={() => handleEditPayroll(run._id)}
                            className="px-3 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 flex items-center gap-1"
                          >
                            <Edit size={14} />
                            Edit
                          </button>
                        )}
                        
                        {/* Submit for Approval - draft only, accountant only */}
                        {run.status === "draft" && !isAdmin && (
                          <button
                            onClick={() => handleSubmitForApproval(run._id)}
                            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
                          >
                            <Check size={14} />
                            Submit for Approval
                          </button>
                        )}
                        
                        {/* Approve/Reject - pending_approval, admin only */}
                        {run.status === "pending_approval" && isAdmin && (
                          <>
                            <button
                              onClick={() => handleApprove(run._id)}
                              className="px-3 py-1 text-xs bg-emerald-500 text-white rounded hover:bg-emerald-600 flex items-center gap-1"
                            >
                              <Check size={14} />
                              Approve
                            </button>
                            <button
                              onClick={() => openRejectModal(run._id)}
                              className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-1"
                            >
                              <XCircle size={14} />
                              Reject
                            </button>
                          </>
                        )}
                        
                        {/* Revert to draft - rejected only */}
                        {run.status === "rejected" && (
                          <button
                            onClick={() => handleRevert(run._id)}
                            className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-1"
                          >
                            <RotateCcw size={14} />
                            Revert to Draft
                          </button>
                        )}
                        
                        {/* Process - approved or draft (admin only for direct processing) */}
                        {(run.status === "approved" || (run.status === "draft" && isAdmin)) && (
                          <button
                            onClick={() => handleProcess(run._id)}
                            className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                          >
                            Process Payment
                          </button>
                        )}
                        
                        {/* Email - paid only */}
                        {run.status === "paid" && (
                          <button
                            onClick={async () => {
                              const res = await axios.get(`${import.meta.env.VITE_API_URL}/payrollruns/${run._id}`);
                              setSelectedRun(res.data);
                              setShowEmailModal(true);
                            }}
                            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
                          >
                            <Mail size={14} />
                            Email
                          </button>
                        )}
                        
                        {/* Delete - draft or rejected only */}
                        {(run.status === "draft" || run.status === "rejected") && (
                          <button
                            onClick={() => handleDelete(run._id)}
                            className="text-destructive hover:text-destructive/80"
                          >
                            <Trash2 size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Generate Payroll Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-foreground">Generate Payroll Run</h2>
              <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handlePreview} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Month</label>
                  <select
                    value={formData.month}
                    onChange={(e) => {
                      const newMonth = parseInt(e.target.value);
                      setFormData({ ...formData, month: newMonth });
                      setWorkingDaysInMonth(getCalendarDaysInMonth(newMonth, formData.year));
                    }}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  >
                    {[...Array(12)].map((_, i) => (
                      <option key={i} value={i + 1}>
                        {getMonthName(i + 1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Year</label>
                  <input
                    type="number"
                    required
                    value={formData.year}
                    onChange={(e) => {
                      const newYear = parseInt(e.target.value);
                      setFormData({ ...formData, year: newYear });
                      setWorkingDaysInMonth(getCalendarDaysInMonth(formData.month, newYear));
                    }}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  />
                </div>
              </div>

              {/* Working Days and Attendance Upload */}
              <div className="bg-muted/50 rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <FileSpreadsheet size={18} />
                    {t("payroll.attendanceData")}
                  </h3>
                  <button
                    type="button"
                    onClick={downloadAttendanceTemplate}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
                  >
                    <Download size={14} />
                    {t("payroll.downloadTemplate")}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t("payroll.workingDaysInMonth")}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={workingDaysInMonth}
                      onChange={(e) => setWorkingDaysInMonth(parseInt(e.target.value) || getCalendarDaysInMonth(formData.month, formData.year))}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t("payroll.uploadAttendance")}
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleAttendanceUpload}
                        className="hidden"
                        id="attendance-upload"
                      />
                      <label
                        htmlFor="attendance-upload"
                        className="flex items-center justify-center gap-2 w-full px-3 py-2 border border-dashed border-border rounded-lg bg-background text-foreground hover:bg-accent cursor-pointer"
                      >
                        <Upload size={16} />
                        {attendanceFile ? attendanceFile.name : t("payroll.chooseFile")}
                      </label>
                    </div>
                  </div>
                </div>

                {attendanceData.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-sm text-green-800">
                      ✓ {t("payroll.attendanceLoaded").replace("{count}", String(attendanceData.length))}
                      {attendanceData.some((a) => a.attendedDays % 1 !== 0) && (
                        <span className="ml-2 text-blue-600">(includes half-day records)</span>
                      )}
                    </p>
                  </div>
                )}

                {/* Attendance Warnings */}
                {attendanceWarnings.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-amber-800 mb-2">
                      ⚠️ {t("payroll.attendanceWarnings")} ({attendanceWarnings.length})
                    </p>
                    <ul className="text-xs text-amber-700 space-y-1 max-h-24 overflow-y-auto">
                      {attendanceWarnings.map((warning, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              warning.type === "missing"
                                ? "bg-red-500"
                                : warning.type === "extra"
                                  ? "bg-orange-500"
                                  : "bg-yellow-500"
                            }`}
                          />
                          {warning.message}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Attendance History */}
                {attendanceHistory.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-blue-800 mb-2">
                      📋 {t("payroll.attendanceHistoryTitle")} ({getMonthName(formData.month)} {formData.year})
                    </p>
                    <div className="max-h-48 overflow-y-auto overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-blue-100 sticky top-0">
                          <tr>
                            <th className="px-2 py-1 text-left">{t("payroll.employee")}</th>
                            <th className="px-2 py-1 text-center">{t("payroll.workingDays")}</th>
                            <th className="px-2 py-1 text-center">{t("payroll.daysAttended")}</th>
                            <th className="px-2 py-1 text-center text-green-700">{t("payroll.sickLeave")}</th>
                            <th className="px-2 py-1 text-center text-blue-700">{t("payroll.casualLeave")}</th>
                            <th className="px-2 py-1 text-center text-purple-700">{t("payroll.annualLeave")}</th>
                            <th className="px-2 py-1 text-center text-red-700">{t("payroll.unpaidLeave")}</th>
                            <th className="px-2 py-1 text-center text-gray-700">{t("payroll.otherLeave")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceHistory.map((record) => (
                            <tr key={record._id} className="border-b border-blue-100">
                              <td className="px-2 py-1">{record.employee?.fullName || record.employee?.employeeId}</td>
                              <td className="px-2 py-1 text-center">{record.workingDays}</td>
                              <td className="px-2 py-1 text-center">{record.attendedDays}</td>
                              <td className="px-2 py-1 text-center text-green-600">{record.sickLeave || 0}</td>
                              <td className="px-2 py-1 text-center text-blue-600">{record.casualLeave || 0}</td>
                              <td className="px-2 py-1 text-center text-purple-600">{record.annualLeave || 0}</td>
                              <td className="px-2 py-1 text-center text-red-600">{record.unpaidLeave || 0}</td>
                              <td className="px-2 py-1 text-center text-gray-600">{record.otherLeave || 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-xs text-blue-600 mt-2 italic">{t("payroll.attendanceHistoryNote")}</p>
                  </div>
                )}
                {loadingHistory && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="animate-spin" size={16} />
                    {t("payroll.loadingHistory")}
                  </div>
                )}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-foreground">
                    Select Employees ({selectedEmployees.length} selected)
                  </label>
                  <div className="space-x-2">
                    <button type="button" onClick={selectAll} className="text-xs text-primary hover:underline">
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={deselectAll}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  placeholder="Search employees..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-3 py-2 mb-2 border border-border rounded-lg bg-background text-foreground"
                />

                <div className="border border-border rounded-lg max-h-64 overflow-y-auto">
                  {filteredEmployees.length === 0 ? (
                    <div className="px-4 py-8 text-center text-muted-foreground">No employees found</div>
                  ) : (
                    filteredEmployees.map((emp) => (
                      <label key={emp._id} className="flex items-center gap-3 px-4 py-2 hover:bg-accent cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedEmployees.includes(emp._id)}
                          onChange={() => toggleEmployee(emp._id)}
                          className="rounded border-border"
                        />
                        <span className="text-sm text-foreground flex-1">
                          {emp.employeeId} - {emp.fullName}
                        </span>
                        <span className="text-xs text-muted-foreground">Rs. {emp.basicSalary.toLocaleString()}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                >
                  Preview Payroll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-8xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-foreground">
                Payroll Preview - {getMonthName(formData.month)} {formData.year}
              </h2>
              <button onClick={resetForm} className="text-muted-foreground hover:text-foreground">
                <X size={24} />
              </button>
            </div>

            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Employee</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Basic</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Perf. Salary</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Transport</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground bg-green-50">
                      Deficit Salary
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground bg-green-50">
                      Include
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Gross</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground bg-blue-50">
                      Days Attended
                    </th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground bg-blue-50">
                      Absent
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground bg-blue-50">
                      Attend. Ded.
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground bg-purple-50" title="EPF/ETF Base = Basic + Performance Salary">
                      EPF/ETF Base
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">EPF(E)</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">APIT</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Stamp</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground bg-orange-50">
                      Other Ded.
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground bg-orange-50">
                      Reason
                    </th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Total Ded.</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Net</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">EPF(ER)</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">ETF</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">CTC</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {previewData.map((entry, idx) => (
                    <tr key={idx} className="hover:bg-accent/50">
                      <td className="px-3 py-2 text-foreground">{entry.employee.fullName}</td>
                      <td className="px-3 py-2 text-right text-foreground">{entry.basicSalary.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={entry.performanceSalary}
                          onChange={(e) => handlePerformanceSalaryChange(idx, e.target.value)}
                          className="w-20 px-2 py-1 text-right border border-border rounded bg-background text-foreground focus:ring-1 focus:ring-primary"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={entry.transportAllowance}
                          onChange={(e) => handleTransportAllowanceChange(idx, e.target.value)}
                          className="w-20 px-2 py-1 text-right border border-border rounded bg-background text-foreground focus:ring-1 focus:ring-primary"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-3 py-2 text-right bg-green-50/50">
                        {entry.deficitSalary > 0 ? (
                          <span className={`font-medium ${entry.includeDeficitInPayroll ? 'text-green-700' : 'text-muted-foreground'}`}>
                            {entry.deficitSalary.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center bg-green-50/50">
                        {entry.deficitSalary > 0 ? (
                          <input
                            type="checkbox"
                            checked={entry.includeDeficitInPayroll}
                            onChange={(e) => handleDeficitToggle(idx, e.target.checked)}
                            className="w-4 h-4 accent-green-600 cursor-pointer border-2 border-green-400 rounded"
                            style={{ accentColor: '#16a34a' }}
                          />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-foreground">
                        {entry.grossSalary.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-center bg-blue-50/50 text-blue-700 font-medium">
                        {Number.isInteger(entry.attendedDays) ? entry.attendedDays : entry.attendedDays.toFixed(1)}/
                        {entry.workingDays || workingDaysInMonth}
                      </td>
                      <td className="px-3 py-2 text-center bg-blue-50/50 text-red-600 font-medium">
                        {Number.isInteger(entry.absentDays) ? entry.absentDays : entry.absentDays.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-right bg-blue-50/50 text-destructive">
                        {entry.attendanceDeduction.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right text-purple-700 bg-purple-50/50 font-medium" title="Basic + Performance Salary">
                        {(entry.basicSalary + entry.performanceSalary).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right text-destructive">{entry.epfEmployee.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-destructive">{(entry.apit || 0).toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-destructive">{entry.stampFee.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right bg-orange-50/50">
                        <input
                          type="number"
                          value={entry.deductionAmount}
                          onChange={(e) => handleDeductionAmountChange(idx, e.target.value)}
                          className="w-20 px-2 py-1 text-right border border-orange-200 rounded bg-background text-foreground focus:ring-1 focus:ring-orange-400"
                          min="0"
                          step="0.01"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-2 bg-orange-50/50">
                        <input
                          type="text"
                          value={entry.deductionReason}
                          onChange={(e) => handleDeductionReasonChange(idx, e.target.value)}
                          className="w-28 px-2 py-1 border border-orange-200 rounded bg-background text-foreground focus:ring-1 focus:ring-orange-400 text-xs"
                          placeholder="Reason..."
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-destructive">
                        {entry.totalDeductions.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-primary">
                        {entry.netSalary.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right text-orange-600">{entry.epfEmployer.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right text-orange-600">{entry.etf.toLocaleString()}</td>
                      <td className="px-3 py-2 text-right font-semibold text-foreground">
                        {entry.totalCTC.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted font-semibold">
                  <tr>
                    <td className="px-3 py-2 text-foreground">Total</td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {previewData.reduce((sum, e) => sum + e.basicSalary, 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {previewData.reduce((sum, e) => sum + e.performanceSalary, 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {previewData.reduce((sum, e) => sum + e.transportAllowance, 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-green-700 bg-green-50/50">
                      {previewData.reduce((sum, e) => sum + (e.includeDeficitInPayroll ? (e.deficitSalary || 0) : 0), 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-center bg-green-50/50">
                      {previewData.filter(e => e.deficitSalary > 0 && e.includeDeficitInPayroll).length}/{previewData.filter(e => e.deficitSalary > 0).length}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {previewData.reduce((sum, e) => sum + e.grossSalary, 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-center bg-blue-50/50 text-blue-700">-</td>
                    <td className="px-3 py-2 text-center bg-blue-50/50 text-red-600">
                      {(() => {
                        const total = previewData.reduce((sum, e) => sum + e.absentDays, 0);
                        return Number.isInteger(total) ? total : total.toFixed(1);
                      })()}
                    </td>
                    <td className="px-3 py-2 text-right bg-blue-50/50 text-destructive">
                      {previewData.reduce((sum, e) => sum + e.attendanceDeduction, 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-purple-700 bg-purple-50/50 font-medium">
                      {previewData.reduce((sum, e) => sum + e.basicSalary + e.performanceSalary, 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-destructive">
                      {previewData.reduce((sum, e) => sum + e.epfEmployee, 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-destructive">
                      {previewData.reduce((sum, e) => sum + (e.apit || 0), 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-destructive">
                      {previewData.reduce((sum, e) => sum + e.stampFee, 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-orange-600 bg-orange-50/50">
                      {previewData.reduce((sum, e) => sum + e.deductionAmount, 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 bg-orange-50/50"></td>
                    <td className="px-3 py-2 text-right text-destructive">
                      {previewData.reduce((sum, e) => sum + e.totalDeductions, 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-primary">
                      {previewData.reduce((sum, e) => sum + e.netSalary, 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-orange-600">
                      {previewData.reduce((sum, e) => sum + e.epfEmployer, 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-orange-600">
                      {previewData.reduce((sum, e) => sum + e.etf, 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {previewData.reduce((sum, e) => sum + e.totalCTC, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Calculation Summary */}
            <div className="mt-4 bg-muted/50 border border-border rounded-lg p-4">
              <h4 className="text-sm font-semibold text-foreground mb-3">Calculation Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="text-muted-foreground">Income Components</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Basic Salary:</span>
                      <span className="font-medium">Rs. {previewData.reduce((sum, e) => sum + e.basicSalary, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Performance Salary:</span>
                      <span className="font-medium">Rs. {previewData.reduce((sum, e) => sum + e.performanceSalary, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transport Allowance:</span>
                      <span className="font-medium">Rs. {previewData.reduce((sum, e) => sum + e.transportAllowance, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-green-700">
                      <span>Deficit Salary (Included):</span>
                      <span className="font-medium">Rs. {previewData.reduce((sum, e) => sum + (e.includeDeficitInPayroll ? (e.deficitSalary || 0) : 0), 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-destructive">
                      <span>Less: Attendance Deduction:</span>
                      <span className="font-medium">Rs. {previewData.reduce((sum, e) => sum + e.attendanceDeduction, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1">
                      <span className="font-semibold">Gross Salary:</span>
                      <span className="font-bold">Rs. {previewData.reduce((sum, e) => sum + e.grossSalary, 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-muted-foreground">Employee Deductions</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-purple-700 bg-purple-50 px-2 py-1 rounded">
                      <span>EPF/ETF Base (Basic + Perf.):</span>
                      <span className="font-medium">Rs. {previewData.reduce((sum, e) => sum + e.basicSalary + e.performanceSalary, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-destructive">
                      <span>EPF (Employee {taxRates?.epfEmployee || 8}%):</span>
                      <span className="font-medium">Rs. {previewData.reduce((sum, e) => sum + e.epfEmployee, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-destructive">
                      <span>APIT:</span>
                      <span className="font-medium">Rs. {previewData.reduce((sum, e) => sum + (e.apit || 0), 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-destructive">
                      <span>Stamp Fee:</span>
                      <span className="font-medium">Rs. {previewData.reduce((sum, e) => sum + e.stampFee, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>Other Deductions:</span>
                      <span className="font-medium">Rs. {previewData.reduce((sum, e) => sum + e.deductionAmount, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1 text-destructive">
                      <span className="font-semibold">Total Deductions:</span>
                      <span className="font-bold">Rs. {previewData.reduce((sum, e) => sum + e.totalDeductions, 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-muted-foreground">Net Payable</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Gross Salary:</span>
                      <span className="font-medium">Rs. {previewData.reduce((sum, e) => sum + e.grossSalary, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-destructive">
                      <span>Less: Total Deductions:</span>
                      <span className="font-medium">Rs. {previewData.reduce((sum, e) => sum + e.totalDeductions, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1 text-primary">
                      <span className="font-semibold">Net Salary:</span>
                      <span className="font-bold text-lg">Rs. {previewData.reduce((sum, e) => sum + e.netSalary, 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-muted-foreground">Employer Contributions</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-purple-700 bg-purple-50 px-2 py-1 rounded">
                      <span>EPF/ETF Base (Basic + Perf.):</span>
                      <span className="font-medium">Rs. {previewData.reduce((sum, e) => sum + e.basicSalary + e.performanceSalary, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>EPF (Employer {taxRates?.epfEmployer || 12}%):</span>
                      <span className="font-medium">Rs. {previewData.reduce((sum, e) => sum + e.epfEmployer, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>ETF ({taxRates?.etf || 3}%):</span>
                      <span className="font-medium">Rs. {previewData.reduce((sum, e) => sum + e.etf, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1">
                      <span className="font-semibold">Total CTC:</span>
                      <span className="font-bold">Rs. {previewData.reduce((sum, e) => sum + e.totalCTC, 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGenerate}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
              >
                Confirm & Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bank Selection Modal */}
      {showBankModal && pendingProcess && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-md p-6 border border-border">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Select Bank Account</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Which bank account will pay the total payroll amount of Rs. {pendingProcess.totalAmount.toLocaleString()}?
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-foreground">Bank Account</label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground"
                  required
                >
                  <option value="">Select bank account</option>
                  {banks.map((bank: any) => (
                    <option key={bank._id} value={bank._id}>
                      {bank.bankName || bank.name} - {bank.accountNumber} ({bank.currency})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowBankModal(false);
                    setPendingProcess(null);
                    setSelectedBank("");
                  }}
                  className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmProcess}
                  disabled={!selectedBank}
                  className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirm & Process
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Notification Modal */}
      {showEmailModal && selectedRun && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-lg p-6 border border-border">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-foreground">Send Payroll Notifications</h2>
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setSelectedRun(null);
                  setShowEmailConfirm(false);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={24} />
              </button>
            </div>

            {!showEmailConfirm ? (
              <div className="space-y-4">
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    <strong>Run:</strong> {selectedRun.runNumber} • {getMonthName(selectedRun.month)} {selectedRun.year}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Employees:</strong> {selectedRun.payrollEntries?.length || 0} will receive email
                    notifications
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    Email notifications will be sent to all employees in this payroll run with their salary details.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => {
                      setShowEmailModal(false);
                      setSelectedRun(null);
                    }}
                    className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowEmailConfirm(true)}
                    disabled={!emailConfig.publicKey}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Mail size={18} />
                    Continue
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-sm text-amber-800 font-medium mb-2">⚠️ Confirm Email Send</p>
                  <p className="text-sm text-amber-700">
                    You are about to send payroll notification emails to{" "}
                    <strong>{selectedRun.payrollEntries?.length || 0} employees</strong>. This action cannot be undone.
                  </p>
                </div>

                <div className="bg-muted rounded-lg p-4">
                  <p className="text-sm text-muted-foreground mb-1">
                    <strong>Payroll Period:</strong> {getMonthName(selectedRun.month)} {selectedRun.year}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Total Net Salary:</strong> LKR {selectedRun.totalNetSalary?.toLocaleString()}
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowEmailConfirm(false)}
                    className="flex-1 px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent"
                  >
                    Back
                  </button>
                  <button
                    onClick={sendPayrollEmails}
                    disabled={sendingEmails}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {sendingEmails ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail size={18} />
                        Confirm & Send
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* View Payroll Run Details Modal */}
      {showViewModal && selectedRun && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-8xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">
                  Payroll Run Details - {selectedRun.runNumber}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {getMonthName(selectedRun.month)} {selectedRun.year} • Status:{" "}
                  <span className={`px-2 py-0.5 text-xs rounded-full ${getStatusColor(selectedRun.status)}`}>
                    {selectedRun.status}
                  </span>
                </p>
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedRun(null);
                  setViewAttendanceData([]);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={24} />
              </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total Employees</p>
                <p className="text-2xl font-bold text-foreground">{selectedRun.totalEmployees}</p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total Gross Salary</p>
                <p className="text-2xl font-bold text-foreground">
                  Rs. {selectedRun.totalGrossSalary.toLocaleString()}
                </p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total Deductions</p>
                <p className="text-2xl font-bold text-destructive">
                  Rs. {selectedRun.totalDeductions.toLocaleString()}
                </p>
              </div>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Total Net Salary</p>
                <p className="text-2xl font-bold text-primary">Rs. {selectedRun.totalNetSalary.toLocaleString()}</p>
              </div>
            </div>

            {/* Employee Payroll Details Table */}
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="bg-muted px-4 py-3 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">Employee Payroll Breakdown</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Serial
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Employee
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        Basic
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        Perf. Salary
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        Transport
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase bg-green-50">
                        Deficit
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        Gross
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        EPF (E)
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">APIT</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        Stamp
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        Other Ded.
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        Deductions
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        Net Salary
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        EPF (ER)
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">ETF</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        Total CTC
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {selectedRun.payrollEntries && selectedRun.payrollEntries.length > 0 ? (
                      selectedRun.payrollEntries.map((entry: any, idx: number) => (
                        <tr key={idx} className="hover:bg-accent/50">
                          <td className="px-3 py-3 text-foreground">{entry.serialNumber}</td>
                          <td className="px-3 py-3 text-foreground">
                            <div>
                              <p className="font-medium">{entry.employee?.fullName || "N/A"}</p>
                              <p className="text-xs text-muted-foreground">{entry.employee?.employeeId || ""}</p>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right text-foreground">{entry.basicSalary.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-foreground">{(entry.performanceSalary || 0).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-foreground">{(entry.transportAllowance || 0).toLocaleString()}</td>
                          <td className="px-3 py-3 text-right bg-green-50/50">
                            {(entry.deficitSalary || 0) > 0 ? (
                              <span className={`font-medium ${entry.includeDeficitInPayroll ? 'text-green-700' : 'text-muted-foreground line-through'}`}>
                                {(entry.deficitSalary || 0).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right font-medium text-foreground">
                            {entry.grossSalary.toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-right text-destructive">
                            {entry.epfEmployee.toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-right text-destructive">
                            {(entry.apit || 0).toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-right text-destructive">{entry.stampFee.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-orange-600" title={entry.deductionReason || "N/A"}>
                            {(entry.deductionAmount || 0).toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-right font-medium text-destructive">
                            {entry.totalDeductions.toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-primary">
                            {entry.netSalary.toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-right text-orange-600">{entry.epfEmployer.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right text-orange-600">{entry.etf.toLocaleString()}</td>
                          <td className="px-3 py-3 text-right font-semibold text-foreground">
                            {entry.totalCTC.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={16} className="px-3 py-8 text-center text-muted-foreground">
                          No payroll entries found
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {selectedRun.payrollEntries && selectedRun.payrollEntries.length > 0 && (
                    <tfoot className="bg-muted font-semibold">
                      <tr>
                        <td colSpan={2} className="px-3 py-3 text-foreground">
                          Total
                        </td>
                        <td className="px-3 py-3 text-right text-foreground">
                          {selectedRun.payrollEntries
                            .reduce((sum: number, e: any) => sum + e.basicSalary, 0)
                            .toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right text-foreground">
                          {selectedRun.payrollEntries
                            .reduce((sum: number, e: any) => sum + (e.performanceSalary || 0), 0)
                            .toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right text-foreground">
                          {selectedRun.payrollEntries
                            .reduce((sum: number, e: any) => sum + (e.transportAllowance || 0), 0)
                            .toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right text-green-700 bg-green-50/50">
                          {selectedRun.payrollEntries
                            .reduce((sum: number, e: any) => sum + (e.includeDeficitInPayroll ? (e.deficitSalary || 0) : 0), 0)
                            .toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right text-foreground">
                          {selectedRun.payrollEntries
                            .reduce((sum: number, e: any) => sum + e.grossSalary, 0)
                            .toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right text-destructive">
                          {selectedRun.payrollEntries
                            .reduce((sum: number, e: any) => sum + e.epfEmployee, 0)
                            .toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right text-destructive">
                          {selectedRun.payrollEntries
                            .reduce((sum: number, e: any) => sum + (e.apit || 0), 0)
                            .toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right text-destructive">
                          {selectedRun.payrollEntries
                            .reduce((sum: number, e: any) => sum + e.stampFee, 0)
                            .toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right text-orange-600">
                          {selectedRun.payrollEntries
                            .reduce((sum: number, e: any) => sum + (e.deductionAmount || 0), 0)
                            .toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right text-destructive">
                          {selectedRun.payrollEntries
                            .reduce((sum: number, e: any) => sum + e.totalDeductions, 0)
                            .toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right text-primary">
                          {selectedRun.payrollEntries
                            .reduce((sum: number, e: any) => sum + e.netSalary, 0)
                            .toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right text-orange-600">
                          {selectedRun.payrollEntries
                            .reduce((sum: number, e: any) => sum + e.epfEmployer, 0)
                            .toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right text-orange-600">
                          {selectedRun.payrollEntries.reduce((sum: number, e: any) => sum + e.etf, 0).toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right text-foreground">
                          {selectedRun.payrollEntries
                            .reduce((sum: number, e: any) => sum + e.totalCTC, 0)
                            .toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedRun(null);
                }}
                className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Draft Payroll Modal */}
      {showEditModal && selectedRun && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg w-full max-w-8xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-foreground">Edit Payroll Run - {selectedRun.runNumber}</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {getMonthName(selectedRun.month)} {selectedRun.year} • Edit performance salary, transport allowance and deductions
                </p>
              </div>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedRun(null);
                  setEditData([]);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={24} />
              </button>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                        Employee
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        Basic
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        Perf. Salary
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        Transport
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase bg-green-50">
                        Deficit
                      </th>
                      <th className="px-3 py-3 text-center text-xs font-medium text-muted-foreground uppercase bg-green-50">
                        Include
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        Gross
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        EPF (E)
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">APIT</th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        Stamp
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase bg-orange-50">
                        Deduction
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase bg-orange-50">
                        Reason
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        Total Ded.
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-muted-foreground uppercase">
                        Net Salary
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {editData.map((entry, idx) => (
                      <tr key={entry._id} className="hover:bg-accent/50">
                        <td className="px-3 py-3 text-foreground">
                          <div>
                            <p className="font-medium">{entry.employee?.fullName || "N/A"}</p>
                            <p className="text-xs text-muted-foreground">{entry.employee?.employeeId || ""}</p>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-right text-foreground">{entry.basicSalary.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right">
                          <input
                            type="number"
                            value={entry.performanceSalary}
                            onChange={(e) => handleEditPerformanceSalaryChange(idx, e.target.value)}
                            className="w-24 px-2 py-1 text-right border border-border rounded bg-background text-foreground focus:ring-1 focus:ring-primary"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="px-3 py-3 text-right">
                          <input
                            type="number"
                            value={entry.transportAllowance}
                            onChange={(e) => handleEditTransportAllowanceChange(idx, e.target.value)}
                            className="w-24 px-2 py-1 text-right border border-border rounded bg-background text-foreground focus:ring-1 focus:ring-primary"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="px-3 py-3 text-right bg-green-50/50">
                          {(entry.deficitSalary || 0) > 0 ? (
                            <span className={`font-medium ${entry.includeDeficitInPayroll ? 'text-green-700' : 'text-muted-foreground'}`}>
                              {(entry.deficitSalary || 0).toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-center bg-green-50/50">
                          {(entry.deficitSalary || 0) > 0 ? (
                            <input
                              type="checkbox"
                              checked={entry.includeDeficitInPayroll}
                              onChange={(e) => handleEditDeficitToggle(idx, e.target.checked)}
                              className="w-4 h-4 accent-green-600 cursor-pointer border-2 border-green-400 rounded"
                              style={{ accentColor: '#16a34a' }}
                            />
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-foreground">
                          {entry.grossSalary.toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right text-destructive">{entry.epfEmployee.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-destructive">{(entry.apit || 0).toLocaleString()}</td>
                        <td className="px-3 py-3 text-right text-destructive">{entry.stampFee.toLocaleString()}</td>
                        <td className="px-3 py-3 text-right bg-orange-50/50">
                          <input
                            type="number"
                            value={entry.deductionAmount}
                            onChange={(e) => handleEditDeductionAmountChange(idx, e.target.value)}
                            className="w-24 px-2 py-1 text-right border border-orange-200 rounded bg-background text-foreground focus:ring-1 focus:ring-orange-400"
                            min="0"
                            step="0.01"
                          />
                        </td>
                        <td className="px-3 py-3 bg-orange-50/50">
                          <input
                            type="text"
                            value={entry.deductionReason}
                            onChange={(e) => handleEditDeductionReasonChange(idx, e.target.value)}
                            className="w-32 px-2 py-1 border border-orange-200 rounded bg-background text-foreground focus:ring-1 focus:ring-orange-400 text-xs"
                            placeholder="Reason..."
                          />
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-destructive">
                          {entry.totalDeductions.toLocaleString()}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-primary">
                          {entry.netSalary.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted font-semibold">
                    <tr>
                      <td className="px-3 py-3 text-foreground">Total</td>
                      <td className="px-3 py-3 text-right text-foreground">
                        {editData.reduce((sum, e) => sum + e.basicSalary, 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right text-foreground">
                        {editData.reduce((sum, e) => sum + e.performanceSalary, 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right text-foreground">
                        {editData.reduce((sum, e) => sum + e.transportAllowance, 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right text-green-700 bg-green-50/50">
                        {editData.reduce((sum, e) => sum + (e.includeDeficitInPayroll ? (e.deficitSalary || 0) : 0), 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 bg-green-50/50"></td>
                      <td className="px-3 py-3 text-right text-foreground">
                        {editData.reduce((sum, e) => sum + e.grossSalary, 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right text-destructive">
                        {editData.reduce((sum, e) => sum + e.epfEmployee, 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right text-destructive">
                        {editData.reduce((sum, e) => sum + (e.apit || 0), 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right text-destructive">
                        {editData.reduce((sum, e) => sum + e.stampFee, 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right text-orange-600 bg-orange-50/50">
                        {editData.reduce((sum, e) => sum + e.deductionAmount, 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 bg-orange-50/50"></td>
                      <td className="px-3 py-3 text-right text-destructive">
                        {editData.reduce((sum, e) => sum + e.totalDeductions, 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 text-right text-primary">
                        {editData.reduce((sum, e) => sum + e.netSalary, 0).toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Calculation Summary */}
            <div className="mt-6 bg-muted/50 border border-border rounded-lg p-4">
              <h4 className="text-sm font-semibold text-foreground mb-3">Calculation Summary</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="text-muted-foreground">Income Components</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Basic Salary:</span>
                      <span className="font-medium">Rs. {editData.reduce((sum, e) => sum + e.basicSalary, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Performance Salary:</span>
                      <span className="font-medium">Rs. {editData.reduce((sum, e) => sum + e.performanceSalary, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Transport Allowance:</span>
                      <span className="font-medium">Rs. {editData.reduce((sum, e) => sum + e.transportAllowance, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-green-700">
                      <span>Deficit Salary (Included):</span>
                      <span className="font-medium">Rs. {editData.reduce((sum, e) => sum + (e.includeDeficitInPayroll ? (e.deficitSalary || 0) : 0), 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1">
                      <span className="font-semibold">Gross Salary:</span>
                      <span className="font-bold">Rs. {editData.reduce((sum, e) => sum + e.grossSalary, 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-muted-foreground">Employee Deductions</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-destructive">
                      <span>EPF (Employee {taxRates?.epfEmployee || 8}%):</span>
                      <span className="font-medium">Rs. {editData.reduce((sum, e) => sum + e.epfEmployee, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-destructive">
                      <span>APIT:</span>
                      <span className="font-medium">Rs. {editData.reduce((sum, e) => sum + (e.apit || 0), 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-destructive">
                      <span>Stamp Fee:</span>
                      <span className="font-medium">Rs. {editData.reduce((sum, e) => sum + e.stampFee, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>Other Deductions:</span>
                      <span className="font-medium">Rs. {editData.reduce((sum, e) => sum + e.deductionAmount, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1 text-destructive">
                      <span className="font-semibold">Total Deductions:</span>
                      <span className="font-bold">Rs. {editData.reduce((sum, e) => sum + e.totalDeductions, 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-muted-foreground">Net Payable</p>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Gross Salary:</span>
                      <span className="font-medium">Rs. {editData.reduce((sum, e) => sum + e.grossSalary, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-destructive">
                      <span>Less: Total Deductions:</span>
                      <span className="font-medium">Rs. {editData.reduce((sum, e) => sum + e.totalDeductions, 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1 text-primary">
                      <span className="font-semibold">Net Salary:</span>
                      <span className="font-bold text-lg">Rs. {editData.reduce((sum, e) => sum + e.netSalary, 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-muted-foreground">Employer Contributions</p>
                  <div className="space-y-1">
                    <div className="flex justify-between text-orange-600">
                      <span>EPF (Employer {taxRates?.epfEmployer || 12}%):</span>
                      <span className="font-medium">Rs. {editData.reduce((sum, e) => sum + (e.epfEmployer || 0), 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>ETF ({taxRates?.etf || 3}%):</span>
                      <span className="font-medium">Rs. {editData.reduce((sum, e) => sum + (e.etf || 0), 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1">
                      <span className="font-semibold">Total CTC:</span>
                      <span className="font-bold">Rs. {editData.reduce((sum, e) => sum + e.totalCTC, 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedRun(null);
                  setEditData([]);
                }}
                className="px-6 py-2 border border-border text-foreground rounded-lg hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2"
              >
                {savingEdit ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Payroll Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-foreground">Reject Payroll</h2>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setPendingRejectId(null);
                  setRejectReason("");
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please provide a reason for rejecting this payroll run. This will be visible to the person who submitted it.
              </p>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Rejection Reason <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-input rounded-lg text-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Enter reason for rejection..."
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setPendingRejectId(null);
                  setRejectReason("");
                }}
                className="px-4 py-2 border border-border text-foreground rounded-lg hover:bg-accent"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim()}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                Reject Payroll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
