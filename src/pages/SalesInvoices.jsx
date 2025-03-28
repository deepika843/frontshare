import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { decodeToken } from "../DecodeToken";
import db from "../config/dbConfig";
import { Edit, Trash2 } from "lucide-react"; // Import icons from lucide-react

const SalesInvoices = () => {
  const navigate = useNavigate();
  const [timePeriod, setTimePeriod] = useState("All Sale Invoices");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filteredBills, setFilteredBills] = useState([]);

  console.log(filteredBills , "filterBills")
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [bills, setBills] = useState([]);
  const [phone, setPhone] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch user phone from token
  useEffect(() => {
    const fetchPhone = async () => {
      try {
        const decodedPhone = await decodeToken();
        setPhone(decodedPhone);
      } catch (err) {
        setError(err);
        setIsLoading(false);
      }
    };

    fetchPhone();
  }, []);

  // Fetch bills when phone is available
  useEffect(() => {
    const fetchBills = async () => {
      if (!phone) return;

      setIsLoading(true);
      try {
        const existingDoc = await db.get(phone);

        // Set all bills to state
        setBills(existingDoc.bills || []);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching bills:", err);
        setError(err);
        setIsLoading(false);
      }
    };

    fetchBills();
  }, [phone]);

  // Filter bills whenever dependencies change
  useEffect(() => {
    filterBills();
  }, [bills, startDate, endDate, timePeriod]);

  const filterBills = () => {
    if (!bills.length) {
      setFilteredBills([]);
      return;
    }
  
    let filtered = bills.filter((bill) => bill.billType === "addsales");
  
    // Function to parse dates safely
    const parseDate = (dateStr) => {
      console.log(dateStr , "dateStr")
      if (!dateStr) return null; // Handle missing values
      const parsedDate = new Date(dateStr);
      if (isNaN(parsedDate.getTime())) {
        console.error(`Invalid Date: ${dateStr}`);
        return null;
      }
      return parsedDate;
    };
  
    if (startDate && endDate) {
      const parsedStartDate = parseDate(startDate);
      const parsedEndDate = parseDate(endDate);
  
      if (parsedStartDate && parsedEndDate) {
        filtered = filtered.filter((bill) => {
          const billDate = parseDate(bill.form?.invoiceDate);
          return billDate && billDate >= parsedStartDate && billDate <= parsedEndDate;
        });
      }
    }
  
    const today = new Date();
    today.setHours(0, 0, 0, 0);
  
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  
    const firstDayOfQuarter = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1);
    const lastDayOfQuarter = new Date(firstDayOfQuarter);
    lastDayOfQuarter.setMonth(firstDayOfQuarter.getMonth() + 3, 0);
  
    const firstDayOfLastQuarter = new Date(firstDayOfQuarter);
    firstDayOfLastQuarter.setMonth(firstDayOfQuarter.getMonth() - 3);
    const lastDayOfLastQuarter = new Date(firstDayOfQuarter);
    lastDayOfLastQuarter.setDate(0);
  
    const firstDayOfYear = new Date(today.getFullYear(), 0, 1);
  
    switch (timePeriod) {
      case "Today":
        filtered = filtered.filter((bill) => {
          const billDate = parseDate(bill.invoiceDate);
         
          return billDate && billDate.toDateString() === today.toDateString();
        });
        break;
      case "This Month":
        filtered = filtered.filter((bill) => {
          const billDate = parseDate(bill.form?.invoiceDate);
          return billDate && billDate >= firstDayOfMonth && billDate <= lastDayOfMonth;
        });
        break;
      case "Last Month":
        filtered = filtered.filter((bill) => {
          const billDate = parseDate(bill.form?.invoiceDate);
          return billDate && billDate >= firstDayOfLastMonth && billDate <= lastDayOfLastMonth;
        });
        break;
      case "This Quarter":
        filtered = filtered.filter((bill) => {
          const billDate = parseDate(bill.form?.invoiceDate);
          return billDate && billDate >= firstDayOfQuarter && billDate <= lastDayOfQuarter;
        });
        break;
      case "Last Quarter":
        filtered = filtered.filter((bill) => {
          const billDate = parseDate(bill.form?.invoiceDate);
          return billDate && billDate >= firstDayOfLastQuarter && billDate <= lastDayOfLastQuarter;
        });
        break;
      case "This Year":
        filtered = filtered.filter((bill) => {
          const billDate = parseDate(bill.form?.invoiceDate);
          return billDate && billDate >= firstDayOfYear;
        });
        break;
      case "Custom":
        // Already handled above
        break;
      default:
        // "All Sale Invoices" - no additional filtering needed
        break;
    }
  
    setFilteredBills(filtered);
  };
  
  
  

  const calculateSummary = () => {
    return filteredBills.reduce(
      (acc, bill) => {
        console.log(
          "bill",bill
        )
        const amount = parseFloat(bill.total) || 0;
        if (bill.status === "Paid") {
          acc.paid += amount;
        } else if (bill.status === "Unpaid") {
          acc.unpaid += amount;
        }
        if (new Date(bill.dueDate) < new Date()) {
          acc.overdue += amount;
        }
        acc.total += amount;
        return acc;
      },
      { paid: 0, unpaid: 0, overdue: 0, total: 0 }
    );
  };

  const summary = calculateSummary();

  const handleDelete = async (billId) => {
    try {
      const existingDoc = await db.get(phone);
      existingDoc.bills = existingDoc.bills.filter((doc) => doc.id !== billId);
      await db.put({ ...existingDoc });

      // Update state with the new bills list
      setBills(existingDoc.bills);
    } catch (err) {
      console.error("Error deleting bill:", err);
      setError(err);
    }
  };

  return (
    <div className="p-2 bg-gray-100 min-h-screen text-sm w-full">
      {/* Header Filters */}
      <div className="bg-white rounded-lg shadow-md p-2 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full px-4 py-2 text-left bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {timePeriod}
          </button>
          {dropdownOpen && (
            <div className="absolute w-full mt-1 bg-white border rounded-lg shadow-lg z-20">
              {[
                "All Sale Invoices",
                "Today",
                "This Month",
                "Last Month",
                "This Quarter",
                "Last Quarter",
                "This Year",
                "Custom",
              ].map((option) => (
                <button
                  key={option}
                  onClick={() => {
                    setTimePeriod(option);
                    setDropdownOpen(false);
                    if (option !== "Custom") {
                      setStartDate("");
                      setEndDate("");
                    }
                  }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:outline-none"
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
        <input
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setTimePeriod("Custom");
          }}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={timePeriod !== "Custom"}
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setTimePeriod("Custom");
          }}
          className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={timePeriod !== "Custom"}
        />
        {/* <select className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="Firm1">Firm1</option>
          <option value="Firm2">Firm2</option>
        </select> */}
      </div>

      {/* Summary Cards */}
      <div className="my-4 grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="bg-green-100 p-4 rounded-lg shadow-md">
          <p className="font-semibold text-green-800">Paid</p>
          <h2 className="text-lg font-bold text-green-900">
            ₹ {summary.paid.toFixed(2)}
          </h2>
        </div>
        <div className="bg-blue-100 p-4 rounded-lg shadow-md">
          <p className="font-semibold text-blue-800">Unpaid</p>
          <h2 className="text-lg font-bold text-blue-900">
            ₹ {summary.unpaid.toFixed(2)}
          </h2>
        </div>
        <div className="bg-red-100 p-4 rounded-lg shadow-md">
          <p className="font-semibold text-red-800">Overdue</p>
          <h2 className="text-lg font-bold text-red-900">
            ₹ {summary.overdue.toFixed(2)}
          </h2>
        </div>
        <div className="bg-yellow-100 p-4 rounded-lg shadow-md">
          <p className="font-semibold text-yellow-800">Total</p>
          <h2 className="text-lg font-bold text-yellow-900">
            ₹ {summary.total.toFixed(2)}
          </h2>
        </div>
      </div>

      {/* Transactions Table with Fixed Height and Scrollbars */}
      <div className="bg-white rounded-lg shadow-md p-4 h-[62vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Transactions Sales</h3>
          <button
            onClick={() =>
              navigate("/add-sales", { state: { page: "addsales" } })
            }
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add Sale
          </button>
        </div>
        {/* Table Container with Both Scrollbars */}
        <div className="relative flex-1 -mx-4">
          <div className="absolute inset-0 overflow-auto">
            <div className="inline-block min-w-full align-middle">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    {[
                      "Date",
                      "Invoice No.",
                      "Party Name",
                      "Transaction Type",
                      "Payment Type",
                      "Amount",
                      "Balance",
                      "Due Date",
                      "Actions",
                    ].map((head) => (
                      <th
                        key={head}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50"
                      >
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-4 text-center">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                      </td>
                    </tr>
                  ) : error ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-6 py-4 text-center text-red-500"
                      >
                        Error: {error.message}
                      </td>
                    </tr>
                  ) : filteredBills.length === 0 ? (
                    <tr>
                      <td
                        colSpan={10}
                        className="px-6 py-4 text-center text-gray-500"
                      >
                        No sales invoices found
                      </td>
                    </tr>
                  ) : (
                    filteredBills.map((transaction, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          {transaction.form?.invoiceDate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {transaction.form?.invoiceNumber
                            ? transaction.form?.invoiceNumber
                            : transaction.invoiceNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {transaction.form?.customer}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {transaction.billType === "addsales" && "Sales"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {transaction.form?.paymentType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {transaction.form?.total}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {transaction.form?.receivedAmount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`${
                              transaction.status === "Paid"
                                ? "text-green-500"
                                : "text-red-500"
                            } font-semibold`}
                          >
                            {transaction.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleDelete(transaction.id)}
                              className="px-3 py-1 border border-red-300 text-red-500 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
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
        </div>
      </div>
    </div>
  );
};

export default SalesInvoices;
