import React, { useState, useEffect } from "react";
import axios from "axios";
import { Trash2, Plus, X, Eye, Mail, Loader2, Edit, Upload, Download, FileSpreadsheet } from "lucide-react";
import emailjs from "@emailjs/browser";
import * as XLSX from "xlsx";
import { useLanguage } from "../contexts/LanguageContext";

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
}

interface Employee {
  _id: string;
  employeeId: string;
  fullName: string;
  email: string;
  basicSalary: number;
  allowances: number;
  apitScenario?: string;
  status: string;
}

interface AttendanceData {
  employeeId: string;
  workingDays: number;
  attendedDays: number;
  absentDays: number;
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
  allowances: number;
  performanceBonus: number;
  deductionAmount: number;
  deductionReason: string;
  attendedDays: number;
  absentDays: number;
  attendanceDeduction: number;
  grossSalary: number;
  epfEmployee: number;
  epfEmployer: number;
  etf: number;
  apit: number;
  apitEmployer: number;
  stampFee: number;
  totalDeductions: number;
  netSalary: number;
  totalCTC: number;
}

interface EditEntry {
  _id: string;
  serialNumber: string;
  employee: any;
  basicSalary: number;
  allowances: number;
  deductionAmount: number;
  deductionReason: string;
  grossSalary: number;
  epfEmployee: number;
  epfEmployer: number;
  etf: number;
  apit: number;
  apitEmployer: number;
  stampFee: number;
  totalDeductions: number;
  netSalary: number;
  totalCTC: number;
}

// EmailJS Configuration - loads from environment variables with fallbacks
const EMAILJS_SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const EMAILJS_TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const EMAILJS_PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

export default function Payroll() {
  const { t } = useLanguage();
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
  const [workingDaysInMonth, setWorkingDaysInMonth] = useState(22);
  const [attendanceWarnings, setAttendanceWarnings] = useState<AttendanceWarning[]>([]);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [viewAttendanceData, setViewAttendanceData] = useState<AttendanceHistory[]>([]);

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
      setEmployees(employeesRes.data.filter((e: Employee) => e.status === "active"));
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
    // Create sample data with all active employees
    const templateData = employees.map((emp) => ({
      "Employee ID": emp.employeeId,
      "Employee Name": emp.fullName,
      "Working Days": workingDaysInMonth,
      "Attended Days": workingDaysInMonth, // Supports decimals for half days (e.g., 21.5)
    }));

    const ws = XLSX.utils.json_to_sheet(templateData);

    // Set column widths
    ws["!cols"] = [{ wch: 15 }, { wch: 30 }, { wch: 15 }, { wch: 20 }];

    // Add a note about half-day support
    const noteSheet = XLSX.utils.aoa_to_sheet([
      ["Instructions:"],
      ["1. Fill in 'Attended Days' for each employee"],
      ["2. Half-days are supported (e.g., 21.5 for 21 full days + 1 half day)"],
      ["3. Do not modify Employee ID column"],
      ["4. Working Days can be adjusted if needed"],
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

          // Validate attended days
          if (attendedDays < 0) {
            warnings.push({
              type: "invalid",
              employeeId,
              message: `${employeeId}: Attended days cannot be negative`,
            });
          }
          if (attendedDays > workingDays) {
            warnings.push({
              type: "invalid",
              employeeId,
              message: `${employeeId}: Attended days (${attendedDays}) exceeds working days (${workingDays})`,
            });
          }

          parsedAttendance.push({
            employeeId,
            workingDays,
            attendedDays: Math.max(0, attendedDays),
            absentDays: Math.max(0, workingDays - attendedDays),
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
    newAllowances: number,
    newPerformanceBonus: number,
    newDeductionAmount: number = entry.deductionAmount,
    newDeductionReason: string = entry.deductionReason,
    newAttendedDays: number = entry.attendedDays,
    newAbsentDays: number = entry.absentDays,
  ): PayrollPreview => {
    if (!taxRates) return entry;

    const basicSalary = entry.basicSalary;
    const allowances = newAllowances;
    const performanceBonus = newPerformanceBonus;
    const deductionAmount = newDeductionAmount;
    const deductionReason = newDeductionReason;
    const attendedDays = newAttendedDays;
    const absentDays = newAbsentDays;

    // Calculate attendance deduction (per day salary × absent days)
    const perDaySalary = basicSalary / workingDaysInMonth;
    const attendanceDeduction = Math.round(perDaySalary * absentDays * 100) / 100;

    const totalAllowances = allowances + performanceBonus;
    const grossSalary = basicSalary + totalAllowances;

    const epfEmployee = Math.round(((basicSalary * taxRates.epfEmployee) / 100) * 100) / 100;
    const epfEmployer = Math.round(((basicSalary * taxRates.epfEmployer) / 100) * 100) / 100;
    const etf = Math.round(((basicSalary * taxRates.etf) / 100) * 100) / 100;
    const stampFee = taxRates.stampFee;

    const apit = calculateAPIT(grossSalary, entry.employee.apitScenario || "employee");

    let deductions: number;
    let netSalary: number;
    let apitEmployer = 0;
    let ctc: number;

    // Include attendance deduction in total deductions
    const totalOtherDeductions = deductionAmount + attendanceDeduction;

    if (entry.employee.apitScenario === "employer") {
      deductions = epfEmployee + stampFee + totalOtherDeductions;
      netSalary = grossSalary - deductions;
      apitEmployer = apit;
      ctc = grossSalary + epfEmployer + etf + apitEmployer;
    } else {
      deductions = epfEmployee + apit + stampFee + totalOtherDeductions;
      netSalary = grossSalary - deductions;
      apitEmployer = 0;
      ctc = grossSalary + epfEmployer + etf;
    }

    return {
      ...entry,
      allowances,
      performanceBonus,
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
      apitEmployer,
      stampFee,
      totalDeductions: deductions,
      netSalary,
      totalCTC: ctc,
    };
  };

  const handleAllowanceChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const updatedPreview = [...previewData];
    updatedPreview[index] = recalculatePayroll(
      updatedPreview[index],
      numValue,
      updatedPreview[index].performanceBonus,
      updatedPreview[index].deductionAmount,
      updatedPreview[index].deductionReason,
      updatedPreview[index].attendedDays,
      updatedPreview[index].absentDays,
    );
    setPreviewData(updatedPreview);
  };

  const handlePerformanceBonusChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const updatedPreview = [...previewData];
    updatedPreview[index] = recalculatePayroll(
      updatedPreview[index],
      updatedPreview[index].allowances,
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
      updatedPreview[index].allowances,
      updatedPreview[index].performanceBonus,
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
      // Add performanceBonus, deduction fields and attendance to preview data
      const dataWithExtras = response.data.map((entry: PayrollPreview) => {
        const attendance = getAttendanceForEmployee(entry.employee.employeeId);
        const attendedDays = attendance?.attendedDays ?? workingDaysInMonth;
        const absentDays = attendance?.absentDays ?? 0;
        const perDaySalary = entry.basicSalary / workingDaysInMonth;
        const attendanceDeduction = Math.round(perDaySalary * absentDays * 100) / 100;

        return {
          ...entry,
          performanceBonus: 0,
          deductionAmount: 0,
          deductionReason: "",
          attendedDays,
          absentDays,
          attendanceDeduction,
        };
      });

      // Recalculate with attendance deductions
      const recalculatedData = dataWithExtras.map((entry: PayrollPreview) =>
        recalculatePayroll(
          entry,
          entry.allowances,
          entry.performanceBonus,
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
      // Send preview data with updated allowances, deductions and attendance
      const employeeData = previewData.map((entry) => ({
        employeeId: entry.employee._id,
        allowances: entry.allowances + entry.performanceBonus,
        deductionAmount: entry.deductionAmount + entry.attendanceDeduction,
        deductionReason: entry.deductionReason
          ? `${entry.deductionReason}${entry.absentDays > 0 ? `, Absent ${entry.absentDays} days` : ""}`
          : entry.absentDays > 0
            ? `Absent ${entry.absentDays} days`
            : "",
      }));

      const runResponse = await axios.post(`${import.meta.env.VITE_API_URL}/payrollruns/generate`, {
        ...formData,
        employeeIds: selectedEmployees,
        employeeData,
      });

      // Save attendance data to backend
      const attendanceToSave = previewData.map((entry) => ({
        employeeId: entry.employee.employeeId,
        workingDays: workingDaysInMonth,
        attendedDays: entry.attendedDays,
        absentDays: entry.absentDays,
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
          allowances: entry.allowances,
          deductionAmount: entry.deductionAmount || 0,
          deductionReason: entry.deductionReason || "",
          grossSalary: entry.grossSalary,
          epfEmployee: entry.epfEmployee,
          epfEmployer: entry.epfEmployer,
          etf: entry.etf,
          apit: entry.apit || 0,
          apitEmployer: entry.apitEmployer || 0,
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

  const recalculateEditEntry = (entry: EditEntry, newAllowances: number, newDeductionAmount: number): EditEntry => {
    if (!taxRates) return entry;

    const basicSalary = entry.basicSalary;
    const allowances = newAllowances;
    const deductionAmount = newDeductionAmount;
    const grossSalary = basicSalary + allowances;

    const epfEmployee = Math.round(((basicSalary * taxRates.epfEmployee) / 100) * 100) / 100;
    const epfEmployer = Math.round(((basicSalary * taxRates.epfEmployer) / 100) * 100) / 100;
    const etf = Math.round(((basicSalary * taxRates.etf) / 100) * 100) / 100;
    const stampFee = taxRates.stampFee;

    const apit = calculateAPIT(grossSalary, entry.employee?.apitScenario || "employee");

    let deductions: number;
    let netSalary: number;
    let apitEmployer = 0;
    let ctc: number;

    if (entry.employee?.apitScenario === "employer") {
      deductions = epfEmployee + stampFee + deductionAmount;
      netSalary = grossSalary - deductions;
      apitEmployer = apit;
      ctc = grossSalary + epfEmployer + etf + apitEmployer;
    } else {
      deductions = epfEmployee + apit + stampFee + deductionAmount;
      netSalary = grossSalary - deductions;
      apitEmployer = 0;
      ctc = grossSalary + epfEmployer + etf;
    }

    return {
      ...entry,
      allowances,
      deductionAmount,
      grossSalary,
      epfEmployee,
      epfEmployer,
      etf,
      apit,
      apitEmployer,
      stampFee,
      totalDeductions: deductions,
      netSalary,
      totalCTC: ctc,
    };
  };

  const handleEditAllowanceChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const updatedData = [...editData];
    updatedData[index] = recalculateEditEntry(updatedData[index], numValue, updatedData[index].deductionAmount);
    setEditData(updatedData);
  };

  const handleEditDeductionAmountChange = (index: number, value: string) => {
    const numValue = parseFloat(value) || 0;
    const updatedData = [...editData];
    updatedData[index] = recalculateEditEntry(updatedData[index], updatedData[index].allowances, numValue);
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
        allowances: entry.allowances,
        deductionAmount: entry.deductionAmount,
        deductionReason: entry.deductionReason,
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
      default:
        return "bg-gray-100 text-gray-800";
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
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(run.status)}`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleViewDetails(run._id)}
                          className="px-3 py-1 text-xs bg-secondary text-secondary-foreground rounded hover:bg-secondary/90 flex items-center gap-1"
                        >
                          <Eye size={14} />
                          View
                        </button>
                        {run.status === "draft" && (
                          <button
                            onClick={() => handleEditPayroll(run._id)}
                            className="px-3 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 flex items-center gap-1"
                          >
                            <Edit size={14} />
                            Edit
                          </button>
                        )}
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
                        {(run.status === "draft" || run.status === "completed") && (
                          <button
                            onClick={() => handleProcess(run._id)}
                            className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                          >
                            Process
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(run._id)}
                          className="text-destructive hover:text-destructive/80"
                        >
                          <Trash2 size={18} />
                        </button>
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
                    onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
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
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
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
                      onChange={(e) => setWorkingDaysInMonth(parseInt(e.target.value) || 22)}
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
                    <div className="max-h-32 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-blue-100">
                          <tr>
                            <th className="px-2 py-1 text-left">{t("payroll.employee")}</th>
                            <th className="px-2 py-1 text-center">{t("payroll.workingDays")}</th>
                            <th className="px-2 py-1 text-center">{t("payroll.daysAttended")}</th>
                            <th className="px-2 py-1 text-center">{t("payroll.absent")}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceHistory.map((record) => (
                            <tr key={record._id} className="border-b border-blue-100">
                              <td className="px-2 py-1">{record.employee?.fullName || record.employee?.employeeId}</td>
                              <td className="px-2 py-1 text-center">{record.workingDays}</td>
                              <td className="px-2 py-1 text-center">{record.attendedDays}</td>
                              <td className="px-2 py-1 text-center text-red-600">{record.absentDays}</td>
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
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Allowances</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Perf. Bonus</th>
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
                    <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">APIT(ER)</th>
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
                          value={entry.allowances}
                          onChange={(e) => handleAllowanceChange(idx, e.target.value)}
                          className="w-20 px-2 py-1 text-right border border-border rounded bg-background text-foreground focus:ring-1 focus:ring-primary"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          value={entry.performanceBonus}
                          onChange={(e) => handlePerformanceBonusChange(idx, e.target.value)}
                          className="w-20 px-2 py-1 text-right border border-border rounded bg-background text-foreground focus:ring-1 focus:ring-primary"
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-foreground">
                        {entry.grossSalary.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-center bg-blue-50/50 text-blue-700 font-medium">
                        {Number.isInteger(entry.attendedDays) ? entry.attendedDays : entry.attendedDays.toFixed(1)}/
                        {workingDaysInMonth}
                      </td>
                      <td className="px-3 py-2 text-center bg-blue-50/50 text-red-600 font-medium">
                        {Number.isInteger(entry.absentDays) ? entry.absentDays : entry.absentDays.toFixed(1)}
                      </td>
                      <td className="px-3 py-2 text-right bg-blue-50/50 text-destructive">
                        {entry.attendanceDeduction.toLocaleString()}
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
                      <td className="px-3 py-2 text-right text-orange-600">{entry.apitEmployer.toLocaleString()}</td>
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
                      {previewData.reduce((sum, e) => sum + e.allowances, 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {previewData.reduce((sum, e) => sum + e.performanceBonus, 0).toLocaleString()}
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
                    <td className="px-3 py-2 text-right text-orange-600">
                      {previewData.reduce((sum, e) => sum + e.apitEmployer, 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {previewData.reduce((sum, e) => sum + e.totalCTC, 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
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
                        Allowances
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
                        APIT (ER)
                      </th>
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
                          <td className="px-3 py-3 text-right text-foreground">{entry.allowances.toLocaleString()}</td>
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
                          <td className="px-3 py-3 text-right text-orange-600">
                            {entry.apitEmployer.toLocaleString()}
                          </td>
                          <td className="px-3 py-3 text-right font-semibold text-foreground">
                            {entry.totalCTC.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={15} className="px-3 py-8 text-center text-muted-foreground">
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
                            .reduce((sum: number, e: any) => sum + e.allowances, 0)
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
                        <td className="px-3 py-3 text-right text-orange-600">
                          {selectedRun.payrollEntries
                            .reduce((sum: number, e: any) => sum + e.apitEmployer, 0)
                            .toLocaleString()}
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
                  {getMonthName(selectedRun.month)} {selectedRun.year} • Edit allowances and deductions
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
                        Allowances
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
                            value={entry.allowances}
                            onChange={(e) => handleEditAllowanceChange(idx, e.target.value)}
                            className="w-24 px-2 py-1 text-right border border-border rounded bg-background text-foreground focus:ring-1 focus:ring-primary"
                            min="0"
                            step="0.01"
                          />
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
                        {editData.reduce((sum, e) => sum + e.allowances, 0).toLocaleString()}
                      </td>
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
    </div>
  );
}
