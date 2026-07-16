CREATE TABLE taxonomy (
    code VARCHAR(64) PRIMARY KEY,
    department VARCHAR(64) NOT NULL,
    description TEXT
);

INSERT INTO taxonomy (code, department, description) VALUES
('ROADS.POTHOLE', 'ROADS', 'Potholes on the road, broken roads, accident risk'),
('SANITATION.SEWER', 'SANITATION', 'Sewer overflow, drainage issue, garbage on street'),
('ELECTRICITY.OUTAGE', 'ELECTRICITY', 'Power cut, no electricity, broken wire, sparking'),
('WATER.NO_SUPPLY', 'WATER', 'No water supply, dirty water, pipeline leak'),
('PUBLIC_SERVICES.OTHER', 'PUBLIC_SERVICES', 'Other general public service issues');
