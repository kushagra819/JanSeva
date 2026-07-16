import type { DepartmentCode } from '../types';

export type CivicDepartment = {
  code: DepartmentCode;
  name: string;
  shortName: string;
  areas: string;
  complaintTypes: string[];
};

export const civicDepartments: CivicDepartment[] = [
  { code: 'ROADS', name: 'Roads & Infrastructure Department', shortName: 'Roads', areas: 'Roads, footpaths, bridges and public right-of-way', complaintTypes: ['Potholes', 'Broken/uneven footpaths', 'Damaged road dividers/railings', 'Missing manhole covers', 'Broken or illegal speed breakers', 'Waterlogging on roads', 'Damaged bridges/flyovers', 'Road construction debris'] },
  { code: 'WATER', name: 'Water Supply Department', shortName: 'Water', areas: 'Water supply, pipelines, tankers and public taps', complaintTypes: ['No water / low pressure', 'Contaminated water', 'Pipe leakage/burst', 'Illegal water connections', 'Water tanker delays', 'Sewage mixing with drinking water', 'Broken public taps/handpumps'] },
  { code: 'ELECTRICITY', name: 'Electricity Department', shortName: 'Electricity', areas: 'Electric supply, streetlights, poles and transformers', complaintTypes: ['Power outage', 'Streetlight not working', 'Exposed/hanging live wires', 'Damaged electric poles', 'Transformer issues/sparking', 'Billing/meter complaints', 'Voltage fluctuation'] },
  { code: 'SANITATION', name: 'Sanitation & Solid Waste Management', shortName: 'Sanitation', areas: 'Waste collection, sewers, toilets and vector control', complaintTypes: ['Garbage not collected', 'Overflowing dustbins/dumps', 'Illegal dumping', 'Public toilet cleanliness/damage', 'Drain/sewer blockage', 'Open defecation spots', 'Dead animal removal', 'Mosquito breeding/fogging'] },
  { code: 'PUBLIC_SAFETY', name: 'Public Safety & Law Enforcement', shortName: 'Public Safety', areas: 'Street safety, traffic, encroachment and hazards', complaintTypes: ['Crime/harassment', 'Illegal parking', 'Traffic signal malfunction', 'Unauthorized construction/encroachment', 'Hawkers blocking paths', 'Stray animal menace', 'Noise pollution', 'Fire hazards'] },
  { code: 'PARKS_HORTICULTURE', name: 'Parks & Horticulture Department', shortName: 'Parks', areas: 'Public parks, trees, playgrounds and green spaces', complaintTypes: ['Unmaintained parks', 'Fallen trees/branches', 'Broken playground equipment', 'Illegal tree cutting', 'Green-space encroachment'] },
  { code: 'HEALTH', name: 'Health Department', shortName: 'Health', areas: 'Public health, food safety and emergency response', complaintTypes: ['Disease outbreaks', 'Unhygienic food vendors', 'Dengue breeding sites', 'Illegal medical practice', 'Ambulance delays'] },
  { code: 'BUILDING_URBAN_PLANNING', name: 'Building & Urban Planning Department', shortName: 'Urban Planning', areas: 'Buildings, land use, safety codes and signage', complaintTypes: ['Illegal construction', 'Building safety hazards', 'Public-land encroachment', 'Building-code violations', 'Unauthorized signage/hoardings'] },
  { code: 'TRANSPORT', name: 'Transport Department', shortName: 'Transport', areas: 'Bus stops, public transport, taxis and crossings', complaintTypes: ['Damaged bus stops', 'Transport delays/overcrowding', 'Auto/taxi meter fraud', 'Parking on transport routes', 'Damaged railway crossings/signals'] },
  { code: 'PUBLIC_SERVICES', name: 'Other / General Grievances', shortName: 'Other', areas: 'Citywide catch-all for uncategorized civic services', complaintTypes: ['Anything not covered by another department'] }
];

export const departmentName = (code?: string) => civicDepartments.find(item => item.code === code)?.name || (code?.replaceAll('_', ' ') ?? 'Awaiting routing');
export const departmentShortName = (code?: string) => civicDepartments.find(item => item.code === code)?.shortName || (code?.replaceAll('_', ' ') ?? 'Other');
