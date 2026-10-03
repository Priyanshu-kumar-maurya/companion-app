// Indian City to State mapping for standardized uniform "${city}, ${state}" location schema
export const CITY_STATE_MAP = {
    'mumbai': 'Mumbai, Maharashtra',
    'pune': 'Pune, Maharashtra',
    'nagpur': 'Nagpur, Maharashtra',
    'nashik': 'Nashik, Maharashtra',
    'thane': 'Thane, Maharashtra',
    'navi mumbai': 'Navi Mumbai, Maharashtra',
    
    'delhi': 'New Delhi, Delhi',
    'new delhi': 'New Delhi, Delhi',
    
    'bangalore': 'Bengaluru, Karnataka',
    'bengaluru': 'Bengaluru, Karnataka',
    'mysore': 'Mysuru, Karnataka',
    
    'hyderabad': 'Hyderabad, Telangana',
    'secunderabad': 'Secunderabad, Telangana',
    
    'chennai': 'Chennai, Tamil Nadu',
    'coimbatore': 'Coimbatore, Tamil Nadu',
    
    'kolkata': 'Kolkata, West Bengal',
    
    'jaunpur': 'Jaunpur, Uttar Pradesh',
    'lucknow': 'Lucknow, Uttar Pradesh',
    'varanasi': 'Varanasi, Uttar Pradesh',
    'noida': 'Noida, Uttar Pradesh',
    'greater noida': 'Greater Noida, Uttar Pradesh',
    'kanpur': 'Kanpur, Uttar Pradesh',
    'agra': 'Agra, Uttar Pradesh',
    'prayagraj': 'Prayagraj, Uttar Pradesh',
    'allahabad': 'Prayagraj, Uttar Pradesh',
    'ghaziabad': 'Ghaziabad, Uttar Pradesh',
    'gorakhpur': 'Gorakhpur, Uttar Pradesh',
    'bareilly': 'Bareilly, Uttar Pradesh',
    'meerut': 'Meerut, Uttar Pradesh',
    'aligarh': 'Aligarh, Uttar Pradesh',
    
    'gurgaon': 'Gurugram, Haryana',
    'gurugram': 'Gurugram, Haryana',
    'faridabad': 'Faridabad, Haryana',
    'panipat': 'Panipat, Haryana',
    
    'jaipur': 'Jaipur, Rajasthan',
    'udaipur': 'Udaipur, Rajasthan',
    'jodhpur': 'Jodhpur, Rajasthan',
    'kota': 'Kota, Rajasthan',
    
    'ahmedabad': 'Ahmedabad, Gujarat',
    'surat': 'Surat, Gujarat',
    'vadodara': 'Vadodara, Gujarat',
    'rajkot': 'Rajkot, Gujarat',
    
    'chandigarh': 'Chandigarh, Punjab',
    'amritsar': 'Amritsar, Punjab',
    'ludhiana': 'Ludhiana, Punjab',
    
    'bhopal': 'Bhopal, Madhya Pradesh',
    'indore': 'Indore, Madhya Pradesh',
    'gwalior': 'Gwalior, Madhya Pradesh',
    'jabalpur': 'Jabalpur, Madhya Pradesh',
    
    'patna': 'Patna, Bihar',
    'gaya': 'Gaya, Bihar',
    'muzaffarpur': 'Muzaffarpur, Bihar',
    
    'ranchi': 'Ranchi, Jharkhand',
    'jamshedpur': 'Jamshedpur, Jharkhand',
    
    'bhubaneswar': 'Bhubaneswar, Odisha',
    'cuttack': 'Cuttack, Odisha',
    
    'raipur': 'Raipur, Chhattisgarh',
    'dehradun': 'Dehradun, Uttarakhand',
    'haridwar': 'Haridwar, Uttarakhand',
    'rishikesh': 'Rishikesh, Uttarakhand',
    'shimla': 'Shimla, Himachal Pradesh',
    'srinagar': 'Srinagar, Jammu & Kashmir',
    'guwahati': 'Guwahati, Assam',
    'goa': 'Panaji, Goa',
    'panaji': 'Panaji, Goa',
    'kochi': 'Kochi, Kerala',
    'thiruvananthapuram': 'Thiruvananthapuram, Kerala',
    
    'india': 'Mumbai, Maharashtra', // normalize generic country name to primary city/state
};

export const formatCapitalize = (str) => {
    if (!str || typeof str !== 'string') return '';
    return str
        .trim()
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
};

export const formatLocation = (rawLocation) => {
    if (!rawLocation || typeof rawLocation !== 'string' || !rawLocation.trim()) {
        return 'Mumbai, Maharashtra';
    }
    const clean = rawLocation.trim();
    const lower = clean.toLowerCase();

    // If it already has comma (e.g. "Mumbai, Maharashtra" or "Jaunpur, UP")
    if (clean.includes(',')) {
        return clean
            .split(',')
            .map(p => formatCapitalize(p))
            .filter(Boolean)
            .join(', ');
    }

    // Direct lookup in Indian city-state map
    if (CITY_STATE_MAP[lower]) {
        return CITY_STATE_MAP[lower];
    }

    // Fallback: If unknown single city, append India or Capitalize
    return `${formatCapitalize(clean)}, India`;
};
