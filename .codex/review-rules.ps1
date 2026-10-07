$ErrorActionPreference = 'Stop'
$adminRoot = 'D:\Apps\epcx-cloud-admin'

$firestorePath = Join-Path $adminRoot 'firestore.rules'
$firestore = (Get-Content -LiteralPath $firestorePath -Raw).Replace("`r`n", "`n")

$oldProjectRules = @'
    function billCheckContractExists(orgId, contractId) {
      return exists(/databases/$(database)/documents/organizations/$(orgId)/billcheckContracts/$(contractId));
    }
'@
$newProjectRules = @'
    function billCheckContractExists(orgId, contractId) {
      return exists(/databases/$(database)/documents/organizations/$(orgId)/billcheckContracts/$(contractId));
    }

    function isProjectAdmin(projectId) {
      return isAuthenticated() &&
        exists(/databases/$(database)/documents/projects/$(projectId)) &&
        (get(/databases/$(database)/documents/projects/$(projectId)).data.ownerId == request.auth.uid ||
         ('members' in get(/databases/$(database)/documents/projects/$(projectId)).data &&
          get(/databases/$(database)/documents/projects/$(projectId)).data.members[request.auth.uid] == 'project_admin'));
    }

    function isProjectMember(projectId) {
      return isAuthenticated() &&
        exists(/databases/$(database)/documents/projects/$(projectId)) &&
        (get(/databases/$(database)/documents/projects/$(projectId)).data.ownerId == request.auth.uid ||
         ('memberIds' in get(/databases/$(database)/documents/projects/$(projectId)).data &&
          request.auth.uid in get(/databases/$(database)/documents/projects/$(projectId)).data.memberIds));
    }

    function isProjectInvitationAcceptance(projectId) {
      return 'acceptedInvitationId' in request.resource.data &&
        existsAfter(/databases/$(database)/documents/projectInvitations/$(request.resource.data.acceptedInvitationId)) &&
        getAfter(/databases/$(database)/documents/projectInvitations/$(request.resource.data.acceptedInvitationId)).data.projectId == projectId &&
        getAfter(/databases/$(database)/documents/projectInvitations/$(request.resource.data.acceptedInvitationId)).data.status == 'accepted' &&
        getAfter(/databases/$(database)/documents/projectInvitations/$(request.resource.data.acceptedInvitationId)).data.acceptedBy == request.auth.uid &&
        getAfter(/databases/$(database)/documents/projectInvitations/$(request.resource.data.acceptedInvitationId)).data.email == request.auth.token.email &&
        request.resource.data.updatedBy == request.auth.uid &&
        request.auth.uid in request.resource.data.memberIds &&
        request.resource.data.members[request.auth.uid] == getAfter(/databases/$(database)/documents/projectInvitations/$(request.resource.data.acceptedInvitationId)).data.role &&
        request.resource.data.memberIds.hasAll(resource.data.memberIds) &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['memberIds', 'members', 'updatedAt', 'updatedBy', 'acceptedInvitationId']);
    }
'@
if (-not $firestore.Contains($oldProjectRules)) { throw 'Firestore helper insertion point not found; no rules were changed.' }
$firestore = $firestore.Replace($oldProjectRules, $newProjectRules)

$oldOrgRules = @'
    // Organizations
    match /organizations/{orgId} {
      allow read: if isAuthenticated() &&
        (request.auth.uid in resource.data.memberIds ||
         request.auth.uid in resource.data.adminIds);
      allow write: if isAuthenticated() &&
        request.auth.uid in resource.data.adminIds;
    }

    // Projects
    match /projects/{projectId} {
      allow read: if isAuthenticated() &&
        (request.auth.uid == resource.data.ownerId ||
         isOrgMember(resource.data.organizationId));
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() &&
        request.auth.uid == resource.data.ownerId;
    }

    // Documents
    match /documents/{docId} {
      allow read: if isAuthenticated() &&
        (request.auth.uid == resource.data.uploadedBy ||
         isOrgMember(resource.data.organizationId));
      allow create: if isAuthenticated();
      allow update, delete: if isAuthenticated() &&
        request.auth.uid == resource.data.uploadedBy;
    }
'@
$newOrgRules = @'
    // Organizations
    match /organizations/{orgId} {
      allow read: if isAuthenticated() && (isOrgMember(orgId) || isOrgAdmin(orgId));
      allow create: if isAuthenticated() &&
        request.resource.data.createdBy == request.auth.uid &&
        request.auth.uid in request.resource.data.memberIds &&
        request.auth.uid in request.resource.data.adminIds;
      allow update, delete: if isOrgAdmin(orgId);
    }

    // Projects
    match /projects/{projectId} {
      allow read: if isAuthenticated() &&
        (request.auth.uid == resource.data.ownerId ||
         ('memberIds' in resource.data && request.auth.uid in resource.data.memberIds) ||
         ('organizationId' in resource.data && isOrgMember(resource.data.organizationId)));
      allow create: if isAuthenticated() &&
        request.resource.data.ownerId == request.auth.uid &&
        request.resource.data.createdBy == request.auth.uid &&
        request.auth.uid in request.resource.data.memberIds &&
        request.resource.data.members[request.auth.uid] == 'project_admin';
      allow update: if isAuthenticated() &&
        (isProjectAdmin(projectId) || isProjectInvitationAcceptance(projectId));
      allow delete: if isAuthenticated() && isProjectAdmin(projectId);
    }

    // Project invitations can only be created by project admins and accepted by
    // the invited account. getAfter() ties the project membership update to the
    // matching accepted invitation in the same atomic batch.
    match /projectInvitations/{invitationId} {
      allow read: if isAuthenticated() &&
        ((resource.data.email == request.auth.token.email && resource.data.status == 'pending') ||
         isProjectAdmin(resource.data.projectId));
      allow create: if isAuthenticated() &&
        request.resource.data.invitedBy == request.auth.uid &&
        request.resource.data.status == 'pending' &&
        request.resource.data.email is string &&
        request.resource.data.role in ['project_admin', 'editor', 'contributor', 'viewer'] &&
        isProjectAdmin(request.resource.data.projectId);
      allow update: if isAuthenticated() &&
        resource.data.status == 'pending' &&
        resource.data.email == request.auth.token.email &&
        request.resource.data.projectId == resource.data.projectId &&
        request.resource.data.email == resource.data.email &&
        request.resource.data.role == resource.data.role &&
        request.resource.data.invitedBy == resource.data.invitedBy &&
        request.resource.data.status == 'accepted' &&
        request.resource.data.acceptedBy == request.auth.uid;
      allow delete: if isAuthenticated() && isProjectAdmin(resource.data.projectId);
    }

    // Documents
    match /documents/{docId} {
      allow read: if isAuthenticated() &&
        (request.auth.uid == resource.data.uploadedBy ||
         ('organizationId' in resource.data && isOrgMember(resource.data.organizationId)) ||
         ('projectId' in resource.data && isProjectMember(resource.data.projectId)));
      allow create: if isAuthenticated() &&
        request.resource.data.uploadedBy == request.auth.uid &&
        (!('organizationId' in request.resource.data) || isOrgMember(request.resource.data.organizationId)) &&
        (!('projectId' in request.resource.data) || isProjectMember(request.resource.data.projectId));
      allow update: if isAuthenticated() &&
        request.auth.uid == resource.data.uploadedBy &&
        request.resource.data.uploadedBy == resource.data.uploadedBy;
      allow delete: if isAuthenticated() && request.auth.uid == resource.data.uploadedBy;
    }
'@
if (-not $firestore.Contains($oldOrgRules)) { throw 'Firestore organization/project block not found; no rules were changed.' }
$firestore = $firestore.Replace($oldOrgRules, $newOrgRules)

$oldReviews = @'
    // Reviews
    match /reviews/{reviewId} {
      allow read: if isAuthenticated() &&
        (request.auth.uid == resource.data.userId ||
         isOrgMember(resource.data.organizationId));
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() &&
        request.auth.uid == resource.data.userId;
      allow delete: if isAuthenticated() &&
        request.auth.uid == resource.data.userId;
    }
'@
$newReviews = @'
    // Reviews
    match /reviews/{reviewId} {
      allow read: if isAuthenticated() &&
        (request.auth.uid == resource.data.userId ||
         ('organizationId' in resource.data && isOrgMember(resource.data.organizationId)));
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid &&
        (!('organizationId' in request.resource.data) || isOrgMember(request.resource.data.organizationId));
      allow update: if isAuthenticated() && request.auth.uid == resource.data.userId &&
        request.resource.data.userId == resource.data.userId;
      allow delete: if isAuthenticated() && request.auth.uid == resource.data.userId;
    }
'@
if (-not $firestore.Contains($oldReviews)) { throw 'Firestore review block not found; no rules were changed.' }
$firestore = $firestore.Replace($oldReviews, $newReviews)
Set-Content -LiteralPath $firestorePath -Value $firestore -NoNewline

$storagePath = Join-Path $adminRoot 'storage.rules'
$storage = (Get-Content -LiteralPath $storagePath -Raw).Replace("`r`n", "`n")
$oldStorageAnchor = @'
    // Drawing documents are private to their owner. Deletes are allowed for
'@
$profileRule = @'
    // Profile photos are private to the account owner and limited to small images.
    match /users/{userId}/profile/{allPaths=**} {
      function owner() {
        return request.auth != null && request.auth.uid == userId;
      }
      function validProfilePhoto() {
        return request.resource != null &&
          request.resource.size <= 5 * 1024 * 1024 &&
          request.resource.contentType in ['image/jpeg', 'image/png', 'image/webp'];
      }
      allow read: if owner();
      allow create, update: if owner() && validProfilePhoto();
      allow delete: if owner();
    }

    // Drawing documents are private to their owner. Deletes are allowed for
'@
if (-not $storage.Contains($oldStorageAnchor)) { throw 'Storage insertion point not found; Firestore rules may have changed but Storage rules were not changed.' }
$storage = $storage.Replace($oldStorageAnchor, $profileRule)
Set-Content -LiteralPath $storagePath -Value $storage -NoNewline

Write-Output 'Updated Firestore and Storage rules. No deployment was performed.'
