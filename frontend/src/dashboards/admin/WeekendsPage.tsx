import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import Select from "react-select";

// Custom Month-Year Picker with react-select dropdowns
function MonthYearPicker({
  value,
  onChange,
  showCalendar,
  setShowCalendar,
}: {
  value: string;
  onChange: (date: string) => void;
  showCalendar: string | null;
  setShowCalendar: (id: string | null) => void;
}) {
  const pickerId = "month-year-picker";
  const isOpen = showCalendar === pickerId;
  const [calendarMonth, setCalendarMonth] = useState(value ? new Date(value) : new Date());

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const monthOptions = monthNames.map((month, idx) => ({
    value: idx,
    label: month
  }));

  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 10; i <= currentYear + 10; i++) {
      years.push({ value: i, label: i.toString() });
    }
    return years;
  }, []);

  const handleApply = () => {
    const formattedDate = `${calendarMonth.getFullYear()}-${String(calendarMonth.getMonth() + 1).padStart(2, "0")}-01`;
    onChange(formattedDate);
    setShowCalendar(null);
  };

  const handleToday = () => {
    const today = new Date();
    const formattedDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
    onChange(formattedDate);
    setShowCalendar(null);
  };

  return (
    <div className="relative" data-picker-id={pickerId}>
      <div className="flex gap-2">
        <div className="rounded-xl border border-[#4f7cff] px-3 py-3 text-sm outline-none transition-all flex items-center bg-gray-50 whitespace-nowrap max-w-[220px]">
          {value 
            ? new Date(value).toLocaleDateString("en-US", { year: "numeric", month: "long" })
            : <span className="text-gray-400">Select</span>
          }
        </div>
        <button
          type="button"
          onClick={() => setShowCalendar(isOpen ? null : pickerId)}
          className="px-4 py-3 rounded-xl border border-[#4f7cff] hover:bg-gray-50 font-bold text-lg"
        >
          📅
        </button>
      </div>

      {isOpen && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" 
          onClick={() => setShowCalendar(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl p-6 w-96"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                type="button"
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                className="px-3 py-1 rounded-lg hover:bg-gray-100 text-2xl"
              >
                ‹
              </button>

              {/* React-Select Dropdowns */}
              <div className="flex gap-2 flex-1 mx-4">
                <Select
                  options={monthOptions}
                  value={monthOptions.find((m) => m.value === calendarMonth.getMonth())}
                  onChange={(selectedOption) => {
                    if (selectedOption) {
                      setCalendarMonth(new Date(calendarMonth.getFullYear(), selectedOption.value));
                    }
                  }}
                  className="flex-1"
                  menuPlacement="top"
                  menuShouldScrollIntoView={false}
                  isSearchable={false}
                  styles={{
                    control: (base) => ({ 
                      ...base, 
                      minHeight: "36px", 
                      height: "36px",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.5rem",
                      fontSize: "0.875rem"
                    }),
                    menuPortal: (base) => ({ ...base, zIndex: 9999 })
                  }}
                  menuPortalTarget={document.body}
                />
                <Select
                  options={yearOptions}
                  value={yearOptions.find((y) => y.value === calendarMonth.getFullYear())}
                  onChange={(selectedOption) => {
                    if (selectedOption) {
                      setCalendarMonth(new Date(selectedOption.value, calendarMonth.getMonth()));
                    }
                  }}
                  className="flex-1"
                  menuPlacement="top"
                  menuShouldScrollIntoView={false}
                  isSearchable={false}
                  styles={{
                    control: (base) => ({ 
                      ...base, 
                      minHeight: "36px", 
                      height: "36px",
                      border: "1px solid #d1d5db",
                      borderRadius: "0.5rem",
                      fontSize: "0.875rem"
                    }),
                    menuPortal: (base) => ({ ...base, zIndex: 9999 })
                  }}
                  menuPortalTarget={document.body}
                />
              </div>

              <button
                type="button"
                onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                className="px-3 py-1 rounded-lg hover:bg-gray-100 text-2xl"
              >
                ›
              </button>
            </div>

            {/* Month and Year Display */}
            <div className="text-center mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-lg font-bold text-blue-700">
                {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCalendar(null)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleToday}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-all"
              >
                Today
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="flex-1 px-4 py-2 bg-[#0074ba] hover:bg-[#005a94] text-white rounded-lg text-sm font-bold transition-all"
              >
                Apply
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default function WeekendsPage() {
  const currentDate = new Date();
  const initialDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-01`;
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [showCalendar, setShowCalendar] = useState<string | null>(null);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Get all weekends for the selected month
  const weekends = useMemo(() => {
    const date = new Date(selectedDate);
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Get first and last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    const weekendDays = [];
    
    // Iterate through all days in the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const currentDay = new Date(year, month, day);
      const dayOfWeek = currentDay.getDay();
      
      // 0 = Sunday, 6 = Saturday
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        weekendDays.push({
          date: currentDay,
          day: day,
          dayName: currentDay.toLocaleDateString("en-US", { weekday: "long" }),
          formattedDate: currentDay.toLocaleDateString("en-US", { 
            weekday: "long", 
            year: "numeric", 
            month: "long", 
            day: "numeric" 
          })
        });
      }
    }
    
    return weekendDays;
  }, [selectedDate]);

  const displayMonth = new Date(selectedDate).getMonth();
  const displayYear = new Date(selectedDate).getFullYear();

  return (
    <div className="p-6 w-full">
      {/* Calendar Picker */}
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold text-gray-800">Weekends</h2>
          <div className="max-w-xs">
            <MonthYearPicker 
              value={selectedDate}
              onChange={setSelectedDate}
              showCalendar={showCalendar}
              setShowCalendar={setShowCalendar}
            />
          </div>
        </div>
      </div>

      {/* Weekends Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">
            Weekends in {monthNames[displayMonth]} {displayYear}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Total weekends: {weekends.length}
          </p>
        </div>

        {weekends.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Day</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Day of Week</th>
                  <th className="px-6 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {weekends.map((weekend, index) => (
                  <tr key={index} className="border-b border-gray-200 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {weekend.formattedDate}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {weekend.day}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        weekend.dayName === "Saturday"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-purple-100 text-purple-700"
                      }`}>
                        {weekend.dayName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                        Weekend
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-lg">No weekends found for this period.</p>
          </div>
        )}
      </div>
    </div>
  );
}
