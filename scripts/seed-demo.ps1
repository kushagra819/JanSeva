param(
    [string]$ApiBase = 'http://localhost:8080/api/v1',
    [string]$ImageDirectory = 'C:\tmp\janseva-seed'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Net.Http

function Invoke-Json {
    param([string]$Method, [string]$Path, $Body = $null, [string]$Token = '')
    $headers = @{}
    if ($Token) { $headers.Authorization = "Bearer $Token" }
    $parameters = @{ Method = $Method; Uri = "$ApiBase$Path"; Headers = $headers }
    if ($null -ne $Body) {
        $parameters.ContentType = 'application/json'
        $parameters.Body = ($Body | ConvertTo-Json -Depth 8 -Compress)
    }
    Invoke-RestMethod @parameters
}

function Login([string]$Email, [string]$Password) {
    Invoke-Json POST '/auth/login' @{ email = $Email; password = $Password }
}

function Ensure-Citizen {
    try {
        Invoke-Json POST '/auth/register' @{
            name = 'Aarav Demo Citizen'; email = 'citizen@jandhwani.demo'
            password = 'Citizen123!@'; phone = '9000000001'
        } | Out-Null
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 409) { throw }
    }
    Login 'citizen@jandhwani.demo' 'Citizen123!@'
}

function Ensure-Staff($AdminToken, [string]$Name, [string]$Email, [string]$Department) {
    try {
        Invoke-Json POST '/admin/users' @{
            name = $Name; email = $Email; password = 'Department123!@'
            role = 'DEPARTMENT_HEAD'; departmentCode = $Department
        } $AdminToken | Out-Null
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 409) { throw }
    }
}

function New-PublicIssue($Text, $Latitude, $Longitude, $Key, $Image, $Department = $null) {
    $report = @{
        text = $Text; latitude = $Latitude; longitude = $Longitude
        idempotencyKey = $Key; channel = 'WEB'
    }
    if ($Department) { $report.departmentOverride = $Department }
    $client = [System.Net.Http.HttpClient]::new()
    $multipart = [System.Net.Http.MultipartFormDataContent]::new()
    $fileStream = $null
    try {
        $reportJson = $report | ConvertTo-Json -Compress
        $jsonPart = [System.Net.Http.StringContent]::new($reportJson, [Text.Encoding]::UTF8, 'application/json')
        $multipart.Add($jsonPart, 'report')
        if ($Image) {
            $imagePath = Join-Path $ImageDirectory $Image
            if (-not (Test-Path -LiteralPath $imagePath)) { throw "Missing seed image: $imagePath" }
            $fileStream = [IO.File]::OpenRead($imagePath)
            $filePart = [System.Net.Http.StreamContent]::new($fileStream)
            $filePart.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::new('image/jpeg')
            $multipart.Add($filePart, 'file', [IO.Path]::GetFileName($imagePath))
        }
        $response = $client.PostAsync("$ApiBase/public/reports", $multipart).GetAwaiter().GetResult()
        $raw = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
        if (-not $response.IsSuccessStatusCode) { throw "Public report failed ($($response.StatusCode)): $raw" }
        ($raw | ConvertFrom-Json).grievance
    } finally {
        $multipart.Dispose()
        if ($fileStream) { $fileStream.Dispose() }
        $client.Dispose()
    }
}

function New-CitizenIssue($Token, $Text, $Latitude, $Longitude, $Key) {
    $grievance = Invoke-Json POST '/grievances' @{
        text = $Text; latitude = $Latitude; longitude = $Longitude
        idempotencyKey = $Key; channel = 'WEB'
    } $Token
    Invoke-Json POST "/grievances/$($grievance.id)/analyze" @{ text = $Text } $Token | Out-Null
    (Invoke-Json GET "/grievances/$($grievance.id)" $null $Token)
}

function Update-Status($AdminToken, $Grievance, [string]$Target) {
    $current = $Grievance.status
    if ($current -eq 'PENDING_REVIEW' -and $Target -ne 'PENDING_REVIEW') {
        $Grievance = Invoke-Json POST "/grievances/$($Grievance.id)/review" @{
            decision = 'APPROVE'; message = 'Reviewed and routed to the responsible department.'
        } $AdminToken
        $current = $Grievance.status
    }
    if ($Target -eq 'PENDING_REVIEW') { return $Grievance }
    if ($current -eq 'ROUTED' -and $Target -in @('IN_PROGRESS', 'RESOLVED')) {
        $Grievance = Invoke-Json PATCH "/staff/grievances/$($Grievance.id)/status" @{
            status = 'IN_PROGRESS'; message = 'Department team has started field action.'
        } $AdminToken
        $current = $Grievance.status
    }
    if ($current -eq 'IN_PROGRESS' -and $Target -eq 'RESOLVED') {
        $Grievance = Invoke-Json PATCH "/staff/grievances/$($Grievance.id)/status" @{
            status = 'RESOLVED'; message = 'Field work completed and the issue was verified as resolved.'
        } $AdminToken
    } elseif ($current -eq 'ROUTED' -and $Target -eq 'REJECTED') {
        $Grievance = Invoke-Json PATCH "/staff/grievances/$($Grievance.id)/status" @{
            status = 'REJECTED'; message = 'Duplicate or outside municipal jurisdiction after verification.'
        } $AdminToken
    }
    $Grievance
}

$admin = Login 'admin@janseva.gov' 'Admin123!@#pass'
$citizen = Ensure-Citizen

Ensure-Staff $admin.accessToken 'Roads Department Head' 'roads@jandhwani.demo' 'ROADS'
Ensure-Staff $admin.accessToken 'Water Department Head' 'water@jandhwani.demo' 'WATER'
Ensure-Staff $admin.accessToken 'Sanitation Department Head' 'sanitation@jandhwani.demo' 'SANITATION'
Ensure-Staff $admin.accessToken 'Parks Department Head' 'parks@jandhwani.demo' 'PARKS_HORTICULTURE'
Ensure-Staff $admin.accessToken 'Electricity Department Head' 'electricity@jandhwani.demo' 'ELECTRICITY'

$seeded = @()
$seeded += ,@((New-PublicIssue 'Large pothole on the main road is dangerous for two-wheelers.' 22.5726 88.3639 'demo-india-kolkata-pothole-v1' 'pothole.jpg' 'ROADS'), 'IN_PROGRESS')
$seeded += ,@((New-PublicIssue 'Overflowing garbage bin has not been collected and waste is spreading on the street.' 28.6139 77.2090 'demo-india-delhi-garbage-v1' 'garbage.jpg' 'SANITATION'), 'RESOLVED')
$seeded += ,@((New-PublicIssue 'A fallen tree and heavy branches are blocking the public road.' 18.5204 73.8567 'demo-india-pune-tree-v1' 'fallen-tree.jpg' 'PARKS_HORTICULTURE'), 'ROUTED')
$seeded += ,@((New-PublicIssue 'Heavy rain has caused dangerous waterlogging across this road.' 13.0827 80.2707 'demo-india-chennai-waterlog-v1' 'waterlogging.jpg' 'ROADS'), 'IN_PROGRESS')
$seeded += ,@((New-PublicIssue 'Exposed live electrical wire is hanging near a busy footpath. Immediate danger.' 17.3850 78.4867 'demo-india-hyderabad-livewire-v1' $null 'ELECTRICITY'), 'PENDING_REVIEW')
$seeded += ,@((New-PublicIssue 'Main water pipe has burst and water is gushing across the neighbourhood road.' 12.9716 77.5946 'demo-india-bengaluru-pipe-v1' $null 'WATER'), 'IN_PROGRESS')
$seeded += ,@((New-PublicIssue 'Unauthorized building construction appears unsafe and blocks public access.' 26.9124 75.7873 'demo-india-jaipur-building-v1' $null 'BUILDING_URBAN_PLANNING'), 'ROUTED')
$seeded += ,@((New-PublicIssue 'Bus stop shelter is damaged and unusable for passengers.' 26.1445 91.7362 'demo-india-guwahati-bus-v1' $null 'TRANSPORT'), 'ROUTED')
$seeded += ,@((New-PublicIssue 'Stagnant water is creating a dengue mosquito breeding site near homes.' 20.2961 85.8245 'demo-india-bhubaneswar-dengue-v1' $null 'HEALTH'), 'RESOLVED')
$seeded += ,@((New-PublicIssue 'Illegal parking is blocking the public transport lane every evening.' 23.0225 72.5714 'demo-india-ahmedabad-parking-v1' $null 'PUBLIC_SAFETY'), 'REJECTED')

$citizenSeeded = @()
$citizenSeeded += ,@((New-CitizenIssue $citizen.accessToken 'Very low water pressure for three days in our residential lane.' 19.0760 72.8777 'demo-citizen-mumbai-water-v1'), 'IN_PROGRESS')
$citizenSeeded += ,@((New-CitizenIssue $citizen.accessToken 'Streetlight is not working and the lane is dark at night.' 13.0827 80.2707 'demo-citizen-chennai-light-v1'), 'RESOLVED')
$citizenSeeded += ,@((New-CitizenIssue $citizen.accessToken 'Garbage has not been collected outside our housing society.' 28.6139 77.2090 'demo-citizen-delhi-garbage-v1'), 'ROUTED')

foreach ($entry in $seeded) { Update-Status $admin.accessToken $entry[0] $entry[1] | Out-Null }
foreach ($entry in $citizenSeeded) { Update-Status $admin.accessToken $entry[0] $entry[1] | Out-Null }

$mapIssues = Invoke-Json GET '/public/map/issues'
$adminIssues = Invoke-Json GET '/staff/grievances?limit=100' $null $admin.accessToken
$citizenIssues = Invoke-Json GET '/grievances/mine' $null $citizen.accessToken
$seededPublicImages = 0
foreach ($entry in $seeded[0..3]) {
    $detail = Invoke-Json GET "/public/map/issues/$($entry[0].id)"
    if ($detail.hasPublicImage) { $seededPublicImages++ }
}

[pscustomobject]@{
    PublicMapIssues = @($mapIssues).Count
    AdminVisibleIssues = @($adminIssues).Count
    CitizenVisibleIssues = @($citizenIssues).Count
    SeededPublicImages = $seededPublicImages
} | Format-List
