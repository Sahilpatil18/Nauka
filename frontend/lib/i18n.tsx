"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Language = "en" | "mr";

/*
 * A flat, page-scoped dictionary rather than next-intl/locale-prefixed
 * routing — this is a single-region Phase 1 app with no need for /en/ vs
 * /mr/ URLs, and route prefixing would touch every existing link/redirect
 * in the app for no real benefit yet.
 *
 * Marathi text below is a first machine-assisted pass, not a substitute for
 * native-speaker review — flagged explicitly to the user before this ships
 * to real fishermen. English is authoritative; if a key is missing in a
 * non-English dictionary, t() falls back to the English string.
 */
const dictionaries: Record<Language, Record<string, string>> = {
  en: {
    "common.error_network": "Could not reach the API",

    "nav.pfz": "PFZ",
    "nav.prices": "Prices",
    "nav.price_entry": "Price entry",
    "nav.verifications": "Verifications",
    "nav.login": "Log in",
    "nav.logout": "Log out",
    "nav.toggle_menu": "Toggle menu",
    "nav.kyc.unverified": "Unverified",
    "nav.kyc.phone_verified": "Phone verified",
    "nav.kyc.full_kyc": "KYC complete",

    "login.title": "Log in to Nauka",
    "login.subtitle_phone": "Enter your phone number to get started",
    "login.subtitle_otp": "Code sent to {{phone}}",
    "login.phone_label": "Phone number",
    "login.role_label": "I am a...",
    "login.role.fisherman": "Fisherman / Boat Owner",
    "login.role.fisherman_desc": "Log catches, view PFZ & prices",
    "login.role.vendor": "Equipment & Gear Vendor",
    "login.role.vendor_desc": "List and sell marine equipment",
    "login.role.buyer": "Exporter / B2B Buyer",
    "login.role.buyer_desc": "Source from vendors, request quotes",
    "login.role.cooperative": "Fisheries Cooperative Society",
    "login.role.cooperative_desc": "Register your society",
    "login.role.admin": "Admin / Field Agent",
    "login.role.admin_desc": "Enter harbour price data",
    "login.send_otp": "Send OTP",
    "login.sending": "Sending...",
    "login.dev_note": "Dev mode: {{note}}. Check the backend server logs for the 6-digit code.",
    "login.otp_label": "Enter OTP",
    "login.verify": "Verify & continue",
    "login.verifying": "Verifying...",
    "login.use_different_number": "Use a different number",

    "fishermanOnboarding.title": "Fisherman profile",
    "fishermanOnboarding.subtitle": "PFZ and prices are browsable without this — complete your profile to log catches.",
    "fishermanOnboarding.boat_details_header": "Boat & operating details",
    "fishermanOnboarding.home_harbour": "Home harbour",
    "fishermanOnboarding.boat_type": "Boat type",
    "fishermanOnboarding.boat_type.mechanized": "Mechanized (trawler, >40m)",
    "fishermanOnboarding.boat_type.motorized": "Motorized (sub 20m)",
    "fishermanOnboarding.boat_type.traditional": "Traditional / artisanal",
    "fishermanOnboarding.target_species": "Target species",
    "fishermanOnboarding.target_species_placeholder": "Pomfret, Mackerel",
    "fishermanOnboarding.save_profile": "Save profile",
    "fishermanOnboarding.documents_header": "Boat documents",
    "fishermanOnboarding.documents_desc": "These numbers can't be checked against ReALCraft or the Port Authority automatically — a harbour agent or admin reviews them by hand.",
    "fishermanOnboarding.doc_status.unverified": "Not submitted",
    "fishermanOnboarding.doc_status.pending_review": "Pending review",
    "fishermanOnboarding.doc_status.verified": "Verified by a reviewer",
    "fishermanOnboarding.doc_status.rejected": "Rejected — needs correction",
    "fishermanOnboarding.reviewer_note": "Reviewer note: {{note}}",
    "fishermanOnboarding.boat_reg_no": "Boat reg. no.",
    "fishermanOnboarding.access_pass_no": "Access pass no.",
    "fishermanOnboarding.high_sea_pass_no": "High sea pass no.",
    "fishermanOnboarding.submit_documents": "Submit documents for review",
    "fishermanOnboarding.update_resubmit": "Update & resubmit",
    "fishermanOnboarding.kyc_header": "Complete KYC",
    "fishermanOnboarding.kyc_desc": "Required before logging catches — browsing PFZ and prices doesn't need this, and it doesn't require document review to be finished.",
    "fishermanOnboarding.aadhaar_label": "Aadhaar",
    "fishermanOnboarding.aadhaar_hint": "last 4 digits only",
    "fishermanOnboarding.submit_kyc": "Submit KYC (dev stub)",
    "fishermanOnboarding.kyc_complete_prefix": "KYC complete — go to your",
    "fishermanOnboarding.dashboard_link": "dashboard",
    "fishermanOnboarding.error_save": "Could not save profile",
    "fishermanOnboarding.error_kyc": "Could not submit KYC",
    "fishermanOnboarding.optional": "optional",

    "fishermanDashboard.title": "My catches",
    "fishermanDashboard.subtitle": "Log your catch and keep a trip history.",
    "fishermanDashboard.pfz_button": "PFZ",
    "fishermanDashboard.prices_button": "Prices",
    "fishermanDashboard.log_catch_header": "Log a catch",
    "fishermanDashboard.species": "Species",
    "fishermanDashboard.species_placeholder": "Pomfret",
    "fishermanDashboard.quantity_kg": "Quantity (kg)",
    "fishermanDashboard.landing_harbour": "Landing harbour",
    "fishermanDashboard.not_specified": "Not specified",
    "fishermanDashboard.catch_time": "Catch time",
    "fishermanDashboard.log_catch_button": "Log catch",
    "fishermanDashboard.logged_success": "Logged {{qty}}kg of {{species}}.",
    "fishermanDashboard.catch_history_header": "Catch history ({{count}})",
    "fishermanDashboard.no_catches_title": "No catches logged yet",
    "fishermanDashboard.no_catches_desc": "Your logged catches will appear here.",
    "fishermanDashboard.error_log": "Could not log catch",
    "fishermanDashboard.error_load": "Failed to load",
    "fishermanDashboard.optional": "optional",
    "recommended.header": "Nearest fishing zones",
    "recommended.desc": "Sorted by real distance from {{harbour}} — closest, INCOIS-verified zones first.",
    "recommended.no_harbour": "Set a home harbour in your profile to see zones sorted by distance.",
    "recommended.no_coords": "We don't have map coordinates on file for your home harbour yet, so distances can't be calculated.",
    "recommended.view_all": "View all PFZ zones →",
    "recommended.distance_km": "{{km}} km away",

    "pfz.title": "Potential Fishing Zones",
    "pfz.subtitle_no_count": "Every zone INCOIS currently publishes for Maharashtra. Rows near one of our named harbours are labeled where that adds real information; the rest are shown as-is.",
    "pfz.subtitle_with_count": "Every zone INCOIS currently publishes for Maharashtra — {{count}} zones. Rows near one of our named harbours are labeled where that adds real information; the rest are shown as-is.",
    "pfz.banner_state": "Maharashtra",
    "pfz.banner_validity": "Forecast validity from {{from}} to {{to}}",
    "pfz.banner_updated": "INCOIS data updated on: {{time}}",
    "pfz.help_text": "Zone position/bearing/distance is pulled live from INCOIS's public advisory page where available; not every zone has real data, so some rows fall back to a clearly-marked estimate — check the badge on each row, and hover it for the exact source.",
    "pfz.search_placeholder": "Search by coast name (e.g. Satpati, Arnala)",
    "pfz.table_view": "Table",
    "pfz.map_view": "Map",
    "pfz.no_advisories": "No advisories available",
    "pfz.no_match_title": "No matching coast",
    "pfz.no_match_desc": 'Nothing matches "{{search}}" — try a different name.',
    "pfz.col_from_coast": "From the coast of",
    "pfz.col_direction": "Direction",
    "pfz.col_bearing": "Bearing (deg)",
    "pfz.col_distance": "Distance (km) From-To",
    "pfz.col_depth": "Depth (mtr) From-To",
    "pfz.col_latitude": "Latitude (dms)",
    "pfz.col_longitude": "Longitude (dms)",
    "pfz.col_data": "Data",
    "pfz.badge_live": "Live",
    "pfz.badge_mock": "Mock",

    "home.badge": "Phase 1 · Maharashtra",
    "home.title": "The digital bridge for Maharashtra's marine sector",
    "home.subtitle": "Connecting fishermen & societies, equipment vendors, and institutional buyers with real-time ocean intelligence — PFZ advisories and harbour landing prices in one place.",
    "home.tagline": "One web portal for fishermen, cooperative societies, equipment vendors, and buyers.",
    "home.go_dashboard": "Go to dashboard",
    "home.complete_profile": "Complete profile",
    "home.login_cta": "Log in with phone OTP",
    "home.feature_pfz_title": "Potential Fishing Zones",
    "home.feature_pfz_desc": "INCOIS-fed PFZ coordinates with sea surface temperature and chlorophyll overlays.",
    "home.feature_prices_title": "Harbour Price Index",
    "home.feature_prices_desc": "Daily species landing prices across 8 Maharashtra harbours, with a 7-day trend.",
    "home.built_for": "Built for the marine value chain",
    "home.role_fisherman": "Fishermen",
    "home.role_fisherman_desc": "Log catches, track history, check PFZ and prices.",
    "home.role_vendor": "Vendors",
    "home.role_vendor_desc": "List equipment, manage stock, respond to RFQs.",
    "home.role_buyer": "Buyers & exporters",
    "home.role_buyer_desc": "Source from vendors, request quotes, track sourcing.",
    "home.role_cooperative": "Cooperative societies",
    "home.role_cooperative_desc": "Register your society and harbour hub.",

    "footer.tagline": "Nauka — Phase 1 · Maharashtra marine sector platform",
  },
  mr: {
    "common.error_network": "एपीआयशी संपर्क होऊ शकला नाही",

    "nav.pfz": "संभाव्य मासेमारी क्षेत्र",
    "nav.prices": "भाव",
    "nav.price_entry": "भाव नोंदणी",
    "nav.verifications": "पडताळण्या",
    "nav.login": "लॉग इन",
    "nav.logout": "लॉग आउट",
    "nav.toggle_menu": "मेनू उघडा/बंद करा",
    "nav.kyc.unverified": "पडताळणी न झालेले",
    "nav.kyc.phone_verified": "फोन पडताळला",
    "nav.kyc.full_kyc": "केवायसी पूर्ण",

    "login.title": "नौकामध्ये लॉग इन करा",
    "login.subtitle_phone": "सुरू करण्यासाठी तुमचा फोन नंबर टाका",
    "login.subtitle_otp": "{{phone}} वर कोड पाठवला आहे",
    "login.phone_label": "फोन नंबर",
    "login.role_label": "मी आहे...",
    "login.role.fisherman": "मच्छीमार / बोट मालक",
    "login.role.fisherman_desc": "पकड नोंदवा, पीएफझेड व भाव पहा",
    "login.role.vendor": "सागरी उपकरण विक्रेता",
    "login.role.vendor_desc": "सागरी उपकरणे सूचीबद्ध करा व विका",
    "login.role.buyer": "निर्यातदार / बी2बी खरेदीदार",
    "login.role.buyer_desc": "विक्रेत्यांकडून खरेदी करा, दरपत्रक मागवा",
    "login.role.cooperative": "मत्स्यव्यवसाय सहकारी संस्था",
    "login.role.cooperative_desc": "तुमची संस्था नोंदवा",
    "login.role.admin": "प्रशासक / क्षेत्रीय प्रतिनिधी",
    "login.role.admin_desc": "बंदर भाव नोंदवा",
    "login.send_otp": "ओटीपी पाठवा",
    "login.sending": "पाठवत आहे…",
    "login.dev_note": "डेव्ह मोड: {{note}}. सहा अंकी कोडसाठी बॅकएंड सर्व्हर लॉग तपासा.",
    "login.otp_label": "ओटीपी टाका",
    "login.verify": "पडताळा व पुढे जा",
    "login.verifying": "पडताळत आहे…",
    "login.use_different_number": "वेगळा नंबर वापरा",

    "fishermanOnboarding.title": "मच्छीमार प्रोफाइल",
    "fishermanOnboarding.subtitle": "याशिवायही पीएफझेड व भाव पाहता येतील — पकड नोंदवण्यासाठी प्रोफाइल पूर्ण करा.",
    "fishermanOnboarding.boat_details_header": "बोट व कामकाजाचे तपशील",
    "fishermanOnboarding.home_harbour": "मूळ बंदर",
    "fishermanOnboarding.boat_type": "बोटीचा प्रकार",
    "fishermanOnboarding.boat_type.mechanized": "यांत्रिक (ट्रॉलर, >40 मी)",
    "fishermanOnboarding.boat_type.motorized": "मोटार बोट (20 मी पेक्षा कमी)",
    "fishermanOnboarding.boat_type.traditional": "पारंपरिक बोट",
    "fishermanOnboarding.target_species": "लक्ष्य प्रजाती",
    "fishermanOnboarding.target_species_placeholder": "पापलेट, बांगडा",
    "fishermanOnboarding.save_profile": "प्रोफाइल जतन करा",
    "fishermanOnboarding.documents_header": "बोटीची कागदपत्रे",
    "fishermanOnboarding.documents_desc": "ही क्रमांक आपोआप रीअलक्राफ्ट किंवा बंदर प्राधिकरणाकडे पडताळता येत नाहीत — बंदर प्रतिनिधी किंवा प्रशासक हाताने तपासतील.",
    "fishermanOnboarding.doc_status.unverified": "सादर केलेले नाही",
    "fishermanOnboarding.doc_status.pending_review": "पडताळणी प्रलंबित",
    "fishermanOnboarding.doc_status.verified": "पडताळणीकर्त्याने पडताळले",
    "fishermanOnboarding.doc_status.rejected": "नाकारले — दुरुस्ती आवश्यक",
    "fishermanOnboarding.reviewer_note": "पडताळणीकर्त्याची टीप: {{note}}",
    "fishermanOnboarding.boat_reg_no": "बोट नोंदणी क्र.",
    "fishermanOnboarding.access_pass_no": "प्रवेश पासचा क्र.",
    "fishermanOnboarding.high_sea_pass_no": "उच्च समुद्र पासचा क्र.",
    "fishermanOnboarding.submit_documents": "पडताळणीसाठी कागदपत्रे सादर करा",
    "fishermanOnboarding.update_resubmit": "अद्ययावत करा व पुन्हा सादर करा",
    "fishermanOnboarding.kyc_header": "केवायसी पूर्ण करा",
    "fishermanOnboarding.kyc_desc": "पकड नोंदवण्यापूर्वी आवश्यक — पीएफझेड व भाव पाहण्यासाठी हे लागत नाही, आणि कागदपत्र पडताळणी पूर्ण होण्याचीही गरज नाही.",
    "fishermanOnboarding.aadhaar_label": "आधार",
    "fishermanOnboarding.aadhaar_hint": "फक्त शेवटचे 4 अंक",
    "fishermanOnboarding.submit_kyc": "केवायसी सादर करा (डेव्ह स्टब)",
    "fishermanOnboarding.kyc_complete_prefix": "केवायसी पूर्ण — तुमच्या",
    "fishermanOnboarding.dashboard_link": "डॅशबोर्डवर",
    "fishermanOnboarding.error_save": "प्रोफाइल जतन करता आले नाही",
    "fishermanOnboarding.error_kyc": "केवायसी सादर करता आले नाही",
    "fishermanOnboarding.optional": "ऐच्छिक",

    "fishermanDashboard.title": "माझी पकड",
    "fishermanDashboard.subtitle": "तुमची पकड नोंदवा आणि फेरीचा इतिहास ठेवा.",
    "fishermanDashboard.pfz_button": "पीएफझेड",
    "fishermanDashboard.prices_button": "भाव",
    "fishermanDashboard.log_catch_header": "पकड नोंदवा",
    "fishermanDashboard.species": "प्रजाती",
    "fishermanDashboard.species_placeholder": "पापलेट",
    "fishermanDashboard.quantity_kg": "प्रमाण (किलो)",
    "fishermanDashboard.landing_harbour": "उतरणी बंदर",
    "fishermanDashboard.not_specified": "नमूद केलेले नाही",
    "fishermanDashboard.catch_time": "पकडीची वेळ",
    "fishermanDashboard.log_catch_button": "पकड नोंदवा",
    "fishermanDashboard.logged_success": "{{qty}} किलो {{species}} नोंदवले.",
    "fishermanDashboard.catch_history_header": "पकड इतिहास ({{count}})",
    "fishermanDashboard.no_catches_title": "अद्याप कोणतीही पकड नोंदवलेली नाही",
    "fishermanDashboard.no_catches_desc": "तुमची नोंदवलेली पकड इथे दिसेल.",
    "fishermanDashboard.error_log": "पकड नोंदवता आली नाही",
    "fishermanDashboard.error_load": "लोड करता आले नाही",
    "fishermanDashboard.optional": "ऐच्छिक",
    "recommended.header": "सर्वात जवळची मासेमारी क्षेत्रे",
    "recommended.desc": "{{harbour}} पासूनच्या खऱ्या अंतरानुसार क्रमवारी — सर्वात जवळची, इनकॉइस-पडताळणीकृत क्षेत्रे आधी.",
    "recommended.no_harbour": "अंतरानुसार क्षेत्रे पाहण्यासाठी तुमच्या प्रोफाइलमध्ये मूळ बंदर निवडा.",
    "recommended.no_coords": "तुमच्या मूळ बंदराचे नकाशा निर्देशांक अद्याप उपलब्ध नाहीत, त्यामुळे अंतर काढता येत नाही.",
    "recommended.view_all": "सर्व पीएफझेड क्षेत्रे पाहा →",
    "recommended.distance_km": "{{km}} किमी दूर",

    "pfz.title": "संभाव्य मासेमारी क्षेत्रे",
    "pfz.subtitle_no_count": "इनकॉइसने महाराष्ट्रासाठी सध्या प्रसिद्ध केलेले प्रत्येक क्षेत्र. आपल्या नोंदणीकृत बंदराजवळील ओळी तशा लेबल केल्या आहेत; बाकीच्या जशा आहेत तशा दाखवल्या आहेत.",
    "pfz.subtitle_with_count": "इनकॉइसने महाराष्ट्रासाठी सध्या प्रसिद्ध केलेले प्रत्येक क्षेत्र — {{count}} क्षेत्रे. आपल्या नोंदणीकृत बंदराजवळील ओळी तशा लेबल केल्या आहेत; बाकीच्या जशा आहेत तशा दाखवल्या आहेत.",
    "pfz.banner_state": "महाराष्ट्र",
    "pfz.banner_validity": "अंदाज वैधता {{from}} पासून {{to}} पर्यंत",
    "pfz.banner_updated": "इनकॉइस डेटा अद्ययावत केला: {{time}}",
    "pfz.help_text": "क्षेत्राची स्थिती/दिशा/अंतर उपलब्ध असेल तिथे इनकॉइसच्या सार्वजनिक सल्ला पानावरून थेट घेतले जाते; प्रत्येक क्षेत्रासाठी खरा डेटा नसतो, त्यामुळे काही ओळी स्पष्टपणे चिन्हांकित अंदाजावर आधारित असतात — प्रत्येक ओळीवरील बॅज तपासा, अचूक स्रोतासाठी त्यावर होवर करा.",
    "pfz.search_placeholder": "किनाऱ्याच्या नावाने शोधा (उदा. सातपाटी, अर्नाळा)",
    "pfz.table_view": "तक्ता",
    "pfz.map_view": "नकाशा",
    "pfz.no_advisories": "कोणताही सल्ला उपलब्ध नाही",
    "pfz.no_match_title": "जुळणारा किनारा नाही",
    "pfz.no_match_desc": '"{{search}}" शी काहीही जुळत नाही — वेगळे नाव वापरून पहा.',
    "pfz.col_from_coast": "या किनाऱ्यापासून",
    "pfz.col_direction": "दिशा",
    "pfz.col_bearing": "दिशाकोन (अंश)",
    "pfz.col_distance": "अंतर (किमी) पासून-पर्यंत",
    "pfz.col_depth": "खोली (मीटर) पासून-पर्यंत",
    "pfz.col_latitude": "अक्षांश (dms)",
    "pfz.col_longitude": "रेखांश (dms)",
    "pfz.col_data": "डेटा",
    "pfz.badge_live": "थेट",
    "pfz.badge_mock": "अंदाजित",

    "home.badge": "टप्पा १ · महाराष्ट्र",
    "home.title": "महाराष्ट्राच्या सागरी क्षेत्रासाठी डिजिटल सेतू",
    "home.subtitle": "मच्छीमार व संस्था, सागरी उपकरण विक्रेते, आणि संस्थात्मक खरेदीदारांना रिअल-टाइम सागरी माहितीशी जोडणे — पीएफझेड सल्ला आणि बंदर उतरणी भाव एकाच ठिकाणी.",
    "home.tagline": "मच्छीमार, सहकारी संस्था, सागरी उपकरण विक्रेते आणि खरेदीदारांसाठी एकच वेब पोर्टल.",
    "home.go_dashboard": "डॅशबोर्डवर जा",
    "home.complete_profile": "प्रोफाइल पूर्ण करा",
    "home.login_cta": "फोन ओटीपीने लॉग इन करा",
    "home.feature_pfz_title": "संभाव्य मासेमारी क्षेत्रे",
    "home.feature_pfz_desc": "समुद्राच्या पृष्ठभागावरील तापमान व क्लोरोफिल आच्छादनासह इनकॉइस-आधारित पीएफझेड निर्देशांक.",
    "home.feature_prices_title": "बंदर भाव निर्देशांक",
    "home.feature_prices_desc": "महाराष्ट्रातील ८ बंदरांवरील दैनंदिन प्रजातीनिहाय उतरणी भाव, ७ दिवसांच्या कलासह.",
    "home.built_for": "सागरी मूल्य साखळीसाठी तयार केलेले",
    "home.role_fisherman": "मच्छीमार",
    "home.role_fisherman_desc": "पकड नोंदवा, इतिहास पाहा, पीएफझेड व भाव तपासा.",
    "home.role_vendor": "विक्रेते",
    "home.role_vendor_desc": "उपकरणे सूचीबद्ध करा, साठा व्यवस्थापित करा, आरएफक्यूला प्रतिसाद द्या.",
    "home.role_buyer": "खरेदीदार व निर्यातदार",
    "home.role_buyer_desc": "विक्रेत्यांकडून खरेदी करा, दरपत्रक मागवा, सोर्सिंगचा मागोवा घ्या.",
    "home.role_cooperative": "सहकारी संस्था",
    "home.role_cooperative_desc": "तुमची संस्था व बंदर केंद्र नोंदवा.",

    "footer.tagline": "नौका — टप्पा १ · महाराष्ट्र सागरी क्षेत्र प्लॅटफॉर्म",
  },
};

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: "en",
  setLanguage: () => {},
  t: (key) => key,
});

const STORAGE_KEY = "nauka_language";

function interpolate(template: string, vars?: Record<string, string | number>) {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "mr") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLanguageState(stored);
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  };

  const t = (key: string, vars?: Record<string, string | number>) => {
    const template = dictionaries[language][key] ?? dictionaries.en[key] ?? key;
    return interpolate(template, vars);
  };

  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}

export const useLanguage = () => useContext(LanguageContext);
