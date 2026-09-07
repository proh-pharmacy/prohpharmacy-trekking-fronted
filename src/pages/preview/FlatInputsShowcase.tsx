import React, { useState } from 'react';
import {
  FlatInputText,
  FlatInputPassword,
  FlatInputNumber,
  FlatTextarea,
  FlatCheckbox,
  FlatRadioGroup,
  FlatDropdown,
  FlatMultiSelect,
  FlatDatePicker,
  FlatSwitch,
  FlatChips,
  FlatAutoComplete,
  FlatSlider,
  FlatRating,
  FlatInputMask,
  FlatInputOtp,
} from '../../components/flat-form';

export const FlatInputsShowcase: React.FC = () => {
  // Form state
  const [textValue, setTextValue] = useState('John Doe');
  const [emailValue, setEmailValue] = useState('');
  const [passwordValue, setPasswordValue] = useState('SecretPass123!');
  const [numberValue, setNumberValue] = useState<number | null>(42);
  const [currencyValue, setCurrencyValue] = useState<number | null>(1250.5);
  const [textareaValue, setTextareaValue] = useState('Special storage instructions: Keep refrigerated at 2-8°C.');
  const [checkboxValue, setCheckboxValue] = useState(true);
  const [termsValue, setTermsValue] = useState(false);
  const [radioValue, setRadioValue] = useState('trekking');
  const [dropdownValue, setDropdownValue] = useState('rx_dispensed');
  const [multiSelectValue, setMultiSelectValue] = useState(['amoxicillin', 'ibuprofen']);
  const [dateValue, setDateValue] = useState<Date | null>(new Date());
  const [switchValue, setSwitchValue] = useState(true);
  const [chipsValue, setChipsValue] = useState(['Antibiotics', 'Urgent', 'Cold Chain']);
  const [autoCompleteValue, setAutoCompleteValue] = useState('');
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [sliderValue, setSliderValue] = useState<number | [number, number]>(65);
  const [ratingValue, setRatingValue] = useState(4);
  const [phoneValue, setPhoneValue] = useState('(555) 234-5678');
  const [otpValue, setOtpValue] = useState<string | number | null>('482910');

  // Sample data
  const statusOptions = [
    { label: 'Prescription Dispensed', value: 'rx_dispensed' },
    { label: 'Pending Verification', value: 'pending_verification' },
    { label: 'In Transit / Trekking', value: 'in_transit' },
    { label: 'Delivered to Health Post', value: 'delivered' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  const medicationOptions = [
    { label: 'Amoxicillin 500mg', value: 'amoxicillin' },
    { label: 'Ibuprofen 400mg', value: 'ibuprofen' },
    { label: 'Paracetamol 500mg', value: 'paracetamol' },
    { label: 'Ciprofloxacin 250mg', value: 'ciprofloxacin' },
    { label: 'Azithromycin 250mg', value: 'azithromycin' },
    { label: 'Oral Rehydration Salts', value: 'ors' },
  ];

  const priorityOptions = [
    { label: 'Routine Trekking', value: 'routine', helperText: 'Standard scheduled delivery' },
    { label: 'Urgent Dispatch', value: 'urgent', helperText: 'Requires delivery within 24h' },
    { label: 'Emergency Evacuation', value: 'emergency', helperText: 'Critical priority route' },
  ];

  const allMedicines = [
    'Amoxicillin',
    'Ampicillin',
    'Aspirin',
    'Atorvastatin',
    'Azithromycin',
    'Ciprofloxacin',
    'Clindamycin',
    'Doxycycline',
    'Erythromycin',
    'Ibuprofen',
    'Metformin',
    'Metronidazole',
    'Omeprazole',
    'Paracetamol',
  ];

  const searchMedicines = (event: { query: string }) => {
    const query = event.query.toLowerCase();
    const results = allMedicines.filter((item) => item.toLowerCase().includes(query));
    setFilteredSuggestions(results);
  };

  const resetAll = () => {
    setTextValue('');
    setEmailValue('');
    setPasswordValue('');
    setNumberValue(null);
    setCurrencyValue(null);
    setTextareaValue('');
    setCheckboxValue(false);
    setTermsValue(false);
    setRadioValue('routine');
    setDropdownValue('');
    setMultiSelectValue([]);
    setDateValue(null);
    setSwitchValue(false);
    setChipsValue([]);
    setAutoCompleteValue('');
    setSliderValue(50);
    setRatingValue(0);
    setPhoneValue('');
    setOtpValue('');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col antialiased">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-300 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/images/prohpharmacy_icon.png"
              alt="ProH Pharmacy Logo"
              className="w-9 h-9 object-contain"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                  ProH Pharmacy Inputs Library
                </h1>
                <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-light-green text-primary-green border border-primary-green/30">
                  Zero Rounded Edges
                </span>
              </div>
              <p className="text-xs text-muted-text">
                Route: <code className="font-mono text-slate-700">/inputs</code> • Flat UI Design System Review
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/buttons"
              className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <i className="pi pi-check-square mr-1.5 text-[10px]" />
              Buttons
            </a>
            <a
              href="/table"
              className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <i className="pi pi-table mr-1.5 text-[10px]" />
              Data Table
            </a>
            <a
              href="/toasts"
              className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <i className="pi pi-bell mr-1.5 text-[10px]" />
              Toasts
            </a>

            <button
              type="button"
              onClick={resetAll}
              className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <i className="pi pi-refresh mr-1 text-[10px]" />
              Clear All
            </button>
            <div className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider">
              Flat Mode Active
            </div>
          </div>
        </div>
      </header>

      {/* Main Grid Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Banner */}
        <div className="mb-8 p-4 bg-white border border-slate-300 border-l-4 border-l-teal-600 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Design Specification Inspection</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              All PrimeReact components rendered below adhere to strict 0px border-radius, clean 1px borders, and flat surface aesthetics.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-teal-600" />
              Radius: 0px
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-slate-300 border border-slate-500" />
              Border: 1px Solid
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Form Controls */}
          <div className="lg:col-span-8 space-y-8">
            {/* 1. Text & Masked Inputs */}
            <section className="bg-white border border-slate-300 p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <i className="pi pi-pencil text-teal-700" />
                    1. Text & Masked Inputs
                  </h3>
                  <p className="text-xs text-slate-500">Standard text, with icons, required, and masked format</p>
                </div>
                <span className="text-[11px] font-mono text-slate-400">FlatInputText / FlatInputMask</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FlatInputText
                  label="Full Name"
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  placeholder="e.g. John Doe"
                  required
                  helperText="Primary caregiver or pharmacist name"
                />

                <FlatInputText
                  label="Email Address"
                  type="email"
                  value={emailValue}
                  onChange={(e) => setEmailValue(e.target.value)}
                  placeholder="pharmacist@proh.org"
                  leftIcon="pi pi-envelope"
                  errorMessage={emailValue && !emailValue.includes('@') ? 'Enter a valid email address' : undefined}
                />

                <FlatInputText
                  label="Trekking Permit Number"
                  placeholder="PRX-9082-A"
                  leftIcon="pi pi-id-card"
                  rightIcon="pi pi-verified"
                />

                <FlatInputMask
                  label="Emergency Contact Phone"
                  mask="(999) 999-9999"
                  value={phoneValue}
                  onChange={(val) => setPhoneValue(val)}
                  placeholder="(555) 000-0000"
                  helperText="Masked phone format"
                />

                <FlatInputText
                  label="Disabled Text Input"
                  value="Read-only System ID: SYS-9941"
                  disabled
                  helperText="Disabled field with flat disabled styling"
                />

                <FlatInputText
                  label="Field with Error State"
                  value="Invalid Input Value"
                  errorMessage="This field failed validation check"
                />
              </div>
            </section>

            {/* 2. Password, Numbers & Currency */}
            <section className="bg-white border border-slate-300 p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <i className="pi pi-lock text-teal-700" />
                    2. Security & Number Inputs
                  </h3>
                  <p className="text-xs text-slate-500">Password mask toggling, integer counter, and currency</p>
                </div>
                <span className="text-[11px] font-mono text-slate-400">FlatInputPassword / FlatInputNumber</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FlatInputPassword
                  label="Account Password"
                  value={passwordValue}
                  onChange={(e) => setPasswordValue(e.target.value)}
                  toggleMask
                  required
                  helperText="Toggle eye icon for password mask"
                />

                <FlatInputNumber
                  label="Medicine Stock Quantity"
                  value={numberValue}
                  onChange={(val) => setNumberValue(val)}
                  showButtons
                  min={0}
                  max={500}
                  helperText="Increment/decrement button control"
                />

                <FlatInputNumber
                  label="Trekking Budget Allowance"
                  value={currencyValue}
                  onChange={(val) => setCurrencyValue(val)}
                  mode="currency"
                  currency="USD"
                  locale="en-US"
                  helperText="Currency mode with 2 decimal points"
                />

                <FlatInputOtp
                  label="Two-Factor OTP Verification"
                  value={otpValue}
                  onChange={(val) => setOtpValue(val)}
                  length={6}
                  helperText="6-digit flat authentication code boxes"
                />
              </div>
            </section>

            {/* 3. Dropdowns, MultiSelect & AutoComplete */}
            <section className="bg-white border border-slate-300 p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <i className="pi pi-list text-teal-700" />
                    3. Selectors & Search Inputs
                  </h3>
                  <p className="text-xs text-slate-500">Single select, multi-select with chips, and autocomplete</p>
                </div>
                <span className="text-[11px] font-mono text-slate-400">FlatDropdown / FlatMultiSelect / FlatAutoComplete</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FlatDropdown
                  label="Shipment Status"
                  value={dropdownValue}
                  options={statusOptions}
                  onChange={(val) => setDropdownValue(val)}
                  placeholder="Select shipment status"
                  filter
                  showClear
                  required
                  helperText="Filterable dropdown with flat panel overlay"
                />

                <FlatAutoComplete
                  label="Medicine Quick Search"
                  value={autoCompleteValue}
                  suggestions={filteredSuggestions}
                  completeMethod={searchMedicines}
                  onChange={(val) => setAutoCompleteValue(val)}
                  placeholder="Start typing (e.g. Amo...)"
                  helperText="Type to search through catalog"
                />

                <div className="sm:col-span-2">
                  <FlatMultiSelect
                    label="Manifest Medications (Multi-Select)"
                    value={multiSelectValue}
                    options={medicationOptions}
                    onChange={(val) => setMultiSelectValue(val)}
                    placeholder="Choose medications for shipment"
                    display="chip"
                    filter
                    showClear
                    helperText="Multiple item selection rendered as flat chips"
                  />
                </div>
              </div>
            </section>

            {/* 4. Date Picker & Multiline Text */}
            <section className="bg-white border border-slate-300 p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <i className="pi pi-calendar text-teal-700" />
                    4. DatePicker & Textarea
                  </h3>
                  <p className="text-xs text-slate-500">Calendar picker with flat popover and auto-resizing textarea</p>
                </div>
                <span className="text-[11px] font-mono text-slate-400">FlatDatePicker / FlatTextarea</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FlatDatePicker
                  label="Trek Departure Date"
                  value={dateValue}
                  onChange={(val) => setDateValue(val)}
                  placeholder="Select departure date"
                  showIcon
                  required
                  helperText="Calendar with flat header, days, and panel"
                />

                <FlatChips
                  label="Tags / Categories"
                  value={chipsValue}
                  onChange={(val) => setChipsValue(val)}
                  placeholder="Type tag and press Enter"
                  helperText="Press Enter after typing each tag"
                />

                <div className="sm:col-span-2">
                  <FlatTextarea
                    label="Route Dispatch Notes & Handover Details"
                    value={textareaValue}
                    onChange={(e) => setTextareaValue(e.target.value)}
                    rows={3}
                    autoResize
                    helperText="Auto-resizing flat multiline textarea"
                  />
                </div>
              </div>
            </section>

            {/* 5. Toggles, Checkboxes & Radios */}
            <section className="bg-white border border-slate-300 p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <i className="pi pi-check-square text-teal-700" />
                    5. Binary & Option Controls
                  </h3>
                  <p className="text-xs text-slate-500">Square checkboxes, rectilinear toggle switches, and radio groups</p>
                </div>
                <span className="text-[11px] font-mono text-slate-400">FlatCheckbox / FlatSwitch / FlatRadioGroup</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <span className="text-xs font-semibold tracking-wide uppercase text-slate-700 block">
                    Checkboxes
                  </span>
                  <FlatCheckbox
                    label="Cold-Chain Required (Keep below 8°C)"
                    checked={checkboxValue}
                    onChange={(val) => setCheckboxValue(val)}
                    helperText="Medicines require temperature logger"
                  />
                  <FlatCheckbox
                    label="I accept trekking transport protocol"
                    checked={termsValue}
                    onChange={(val) => setTermsValue(val)}
                    required
                    errorMessage={!termsValue ? 'Agreement is required before dispatch' : undefined}
                  />
                  <FlatCheckbox
                    label="Disabled Checkbox Option"
                    checked={true}
                    disabled
                    helperText="Fixed system setting"
                  />
                </div>

                <div className="space-y-4">
                  <span className="text-xs font-semibold tracking-wide uppercase text-slate-700 block">
                    Flat Rectilinear Switches
                  </span>
                  <FlatSwitch
                    label="Satellite GPS Tracker Active"
                    checked={switchValue}
                    onChange={(val) => setSwitchValue(val)}
                    helperText="Transmit location every 15 minutes"
                  />
                  <FlatSwitch
                    label="Emergency Beacon Standby"
                    checked={false}
                    helperText="Manual activation in case of hazard"
                  />
                  <FlatSwitch
                    label="Disabled Switch"
                    checked={true}
                    disabled
                    helperText="Locked by supervisor"
                  />
                </div>

                <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                  <FlatRadioGroup
                    name="priority_selection"
                    label="Delivery Priority Tier"
                    options={priorityOptions}
                    value={radioValue}
                    onChange={(val) => setRadioValue(String(val))}
                    orientation="horizontal"
                    required
                  />
                </div>
              </div>
            </section>

            {/* 6. Slider & Rating */}
            <section className="bg-white border border-slate-300 p-6 shadow-xs space-y-5">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <i className="pi pi-sliders-h text-teal-700" />
                    6. Slider & Rating
                  </h3>
                  <p className="text-xs text-slate-500">Flat linear slider track with sharp handle and rating stars</p>
                </div>
                <span className="text-[11px] font-mono text-slate-400">FlatSlider / FlatRating</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FlatSlider
                  label="Trail Difficulty Rating"
                  value={sliderValue}
                  onChange={(val) => setSliderValue(val)}
                  min={0}
                  max={100}
                  helperText="0 = Flat Valley / 100 = High Mountain Pass"
                />

                <FlatRating
                  label="Facility Service Rating"
                  value={ratingValue}
                  onChange={(val) => setRatingValue(val)}
                  stars={5}
                  helperText="Overall field feedback rating"
                />
              </div>
            </section>
          </div>

          {/* Right Column: Live Form State Inspector */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-6">
              {/* Form State Card */}
              <div className="bg-slate-900 text-white border border-slate-800 p-5 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-400 animate-pulse" />
                    <h3 className="text-xs font-bold tracking-wider uppercase text-slate-200">
                      Live State Inspector
                    </h3>
                  </div>
                  <span className="text-[10px] font-mono bg-slate-800 text-teal-300 px-2 py-0.5 border border-slate-700">
                    Reactive JSON
                  </span>
                </div>

                <div className="max-h-[500px] overflow-auto bg-slate-950 p-3 border border-slate-800 font-mono text-xs text-teal-300 leading-relaxed">
                  <pre>
                    {JSON.stringify(
                      {
                        fullName: textValue,
                        email: emailValue,
                        password: passwordValue ? '••••••••' : '',
                        stockQuantity: numberValue,
                        allowanceUSD: currencyValue,
                        otpCode: otpValue,
                        phone: phoneValue,
                        status: dropdownValue,
                        medications: multiSelectValue,
                        departureDate: dateValue ? dateValue.toISOString().slice(0, 10) : null,
                        coldChainRequired: checkboxValue,
                        termsAccepted: termsValue,
                        priority: radioValue,
                        satelliteGPS: switchValue,
                        tags: chipsValue,
                        searchMedicine: autoCompleteValue,
                        difficulty: sliderValue,
                        serviceRating: ratingValue,
                        notes: textareaValue,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Components Tested: 16</span>
                  <span className="text-emerald-400 font-semibold">100% Flat UI</span>
                </div>
              </div>

              {/* Design Verification Highlights */}
              <div className="bg-white border border-slate-300 p-5 shadow-xs space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <i className="pi pi-shield text-teal-700" />
                  Styling Audit
                </h4>
                <ul className="text-xs text-slate-600 space-y-2">
                  <li className="flex items-start gap-2">
                    <i className="pi pi-check text-teal-700 mt-0.5 text-[11px]" />
                    <span><strong>Border-Radius:</strong> Globally set to 0px across inputs, panels, handles, and chips.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="pi pi-check text-teal-700 mt-0.5 text-[11px]" />
                    <span><strong>Color System:</strong> Professional teal/slate enterprise theme (`lara-light-teal`).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="pi pi-check text-teal-700 mt-0.5 text-[11px]" />
                    <span><strong>Borders & Shadows:</strong> Crisp 1px solid edges without rounded pill shadows.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <i className="pi pi-check text-teal-700 mt-0.5 text-[11px]" />
                    <span><strong>Accessibility:</strong> Full label association, error banners, and keyboard focus states.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default FlatInputsShowcase;
