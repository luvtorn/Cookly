# One-time operator setup. Never paste credentials into this file or a command line.
# Reference: https://cloudinary.com/documentation/admin_api#assign_folder_roles
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$cooklyHeaders = $null
$cooklyCredential = $null
$cooklyBasic = $null
$cooklyPair = $null

try {
    $cooklyCloud = (Read-Host 'Cloud name of the Cookly product environment').Trim()
    $cooklyTargetKey = (Read-Host 'API key to grant access to (the restricted cookly key)').Trim()
    if ($cooklyCloud -notmatch '^[a-zA-Z0-9_-]+$' -or $cooklyTargetKey -notmatch '^\d+$') {
        throw 'Invalid cloud name or target key.'
    }

    $cooklyCredential = Get-Credential -Message 'Administrative PRODUCT ENVIRONMENT credentials: username = API key, password = API secret. Not your Cloudinary login.'
    if ($null -eq $cooklyCredential -or $cooklyCredential.UserName -notmatch '^\d+$') {
        throw 'Administrative product environment credentials are required.'
    }
    if ($cooklyCredential.UserName -eq $cooklyTargetKey) {
        throw 'Use a separate administrative key; do not elevate the application key.'
    }

    $cooklyPair = '{0}:{1}' -f $cooklyCredential.UserName, $cooklyCredential.GetNetworkCredential().Password
    $cooklyBasic = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($cooklyPair))
    $cooklyHeaders = @{ Authorization = "Basic $cooklyBasic" }
    $cooklyBase = "https://api.cloudinary.com/v1_1/$cooklyCloud"
    $cooklyFolders = @()
    $cooklyCursor = $null
    do {
        $cooklyUrl = "$cooklyBase/folders?max_results=500"
        if ($cooklyCursor) { $cooklyUrl += '&next_cursor=' + [Uri]::EscapeDataString($cooklyCursor) }
        $cooklyPage = Invoke-RestMethod -Method Get -Uri $cooklyUrl -Headers $cooklyHeaders -TimeoutSec 30
        $cooklyFolders += @($cooklyPage.folders | Where-Object { $_.path -ceq 'cookly' })
        $cooklyCursor = $cooklyPage.next_cursor
    } while ($cooklyCursor)

    if ($cooklyFolders.Count -ne 1 -or -not $cooklyFolders[0].external_id) {
        throw 'Exactly one root folder named cookly with an external_id is required.'
    }
    $cooklyFolderId = [Uri]::EscapeDataString($cooklyFolders[0].external_id)
    Write-Host "Target: cloud=$cooklyCloud; folder=cookly; role=Contributor; key ending=$($cooklyTargetKey.Substring([Math]::Max(0, $cooklyTargetKey.Length - 4)))"
    if ((Read-Host 'Type GRANT to add this folder role without changing other roles') -cne 'GRANT') {
        Write-Host 'Cancelled. No permissions were changed.'
        return
    }
    $cooklyBody = @{
        principal = @{ id = $cooklyTargetKey; type = 'apiKey' }
        operation = 'add'
        roles = @('cld::role::folder::contributor')
    } | ConvertTo-Json -Depth 4
    $null = Invoke-RestMethod -Method Post -Uri "$cooklyBase/folder_operations/invite/$cooklyFolderId" -Headers $cooklyHeaders -ContentType 'application/json' -Body $cooklyBody -TimeoutSec 30
    Write-Host 'Cloudinary accepted the folder-role assignment. Application upload verification is still required.'
} catch {
    $cooklyStatus = $_.Exception.Response.StatusCode
    if ($null -ne $cooklyStatus) {
        Write-Host "Cloudinary request failed (HTTP $([int]$cooklyStatus)). Do not share credentials or raw response dumps."
    } else {
        Write-Host 'Setup did not finish. Check the input, administrative credentials and root cookly folder. Do not share credentials.'
    }
    Write-Host 'If the final POST timed out, inspect folder permissions before retrying; it may have succeeded.'
    exit 1
} finally {
    if ($null -ne $cooklyHeaders) { $cooklyHeaders.Clear() }
    $cooklyPair = $null
    $cooklyBasic = $null
    $cooklyCredential = $null
}
