
  Waiting for the research subagents to complete their analysis...                                                                                                         
                                                                                                                                                                           
  [MESSAGE FROM SUBAGENT (Evidence Schema Researcher - d5093bff-a6ad-4d42-a2c4-6f6d6ca22c60)]: Here are all findings for the evidence system in the Probo codebase:        
  ──────                                                                                                                                                                   
  ## 1. SQL Migration Files                                                                                                                                                
                                                                                                                                                                           
  ### Main Evidence Table                                                                                                                                                  
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/migrations/000005_create_evidence_table.up.sql                                                                    
                                                                                                                                                                           
    CREATE TABLE IF NOT EXISTS evidences (                                                                                                                                 
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                                                                                                                     
        tenant_id UUID NOT NULL,                                                                                                                                           
        organization_id UUID NOT NULL REFERENCES organizations(id),                                                                                                        
        name TEXT NOT NULL,                                                                                                                                                
        description TEXT NOT NULL DEFAULT '',                                                                                                                              
        state TEXT NOT NULL DEFAULT 'draft',                                                                                                                               
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),                                                                                                                     
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()                                                                                                                      
    );                                                                                                                                                                     
    CREATE INDEX IF NOT EXISTS idx_evidences_organization_id ON evidences (organization_id);                                                                               
                                                                                                                                                                           
  ### Control-Evidence Junction Table                                                                                                                                      
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/migrations/000006_create_controls_evidences_table.up.sql                                                          
                                                                                                                                                                           
    CREATE TABLE IF NOT EXISTS controls_evidences (                                                                                                                        
        control_id UUID NOT NULL REFERENCES controls(id),                                                                                                                  
        evidence_id UUID NOT NULL REFERENCES evidences(id),                                                                                                                
        PRIMARY KEY (control_id, evidence_id)                                                                                                                              
    );                                                                                                                                                                     
    CREATE INDEX IF NOT EXISTS idx_controls_evidences_evidence_id ON controls_evidences (evidence_id);                                                                     
    CREATE INDEX IF NOT EXISTS idx_controls_evidences_control_id ON controls_evidences (control_id);                                                                       
                                                                                                                                                                           
  ### Evidence Files Table                                                                                                                                                 
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/migrations/000009_create_evidence_files_table.up.sql                                                              
                                                                                                                                                                           
    CREATE TABLE IF NOT EXISTS evidence_files (                                                                                                                            
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                                                                                                                     
        tenant_id UUID NOT NULL,                                                                                                                                           
        evidence_id UUID NOT NULL REFERENCES evidences(id),                                                                                                                
        name TEXT NOT NULL,                                                                                                                                                
        content_type TEXT NOT NULL DEFAULT 'application/octet-stream',                                                                                                     
        size BIGINT NOT NULL DEFAULT 0,                                                                                                                                    
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),                                                                                                                     
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()                                                                                                                      
    );                                                                                                                                                                     
    CREATE INDEX IF NOT EXISTS idx_evidence_files_evidence_id ON evidence_files (evidence_id);                                                                             
                                                                                                                                                                           
  ### Task-Evidence Junction Table                                                                                                                                         
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/migrations/000023_create_task_evidences_table.up.sql                                                              
                                                                                                                                                                           
    CREATE TABLE IF NOT EXISTS task_evidences (                                                                                                                            
        task_id UUID NOT NULL REFERENCES tasks(id),                                                                                                                        
        evidence_id UUID NOT NULL REFERENCES evidences(id),                                                                                                                
        PRIMARY KEY (task_id, evidence_id)                                                                                                                                 
    );                                                                                                                                                                     
    CREATE INDEX IF NOT EXISTS idx_task_evidences_evidence_id ON task_evidences (evidence_id);                                                                             
    CREATE INDEX IF NOT EXISTS idx_task_evidences_task_id ON task_evidences (task_id);                                                                                     
                                                                                                                                                                           
  ### Validity Date Column                                                                                                                                                 
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/migrations/000028_add_valid_until_date_to_evidences_table.up.sql                                                  
                                                                                                                                                                           
    ALTER TABLE evidences ADD COLUMN valid_until DATE;                                                                                                                     
                                                                                                                                                                           
  ### Additional Evidence Fields                                                                                                                                           
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/migrations/000034_add_evidence_fields.up.sql                                                                      
                                                                                                                                                                           
    ALTER TABLE evidences ADD COLUMN evidence_type TEXT NOT NULL DEFAULT 'document';                                                                                       
    ALTER TABLE evidences ADD COLUMN url TEXT NOT NULL DEFAULT '';                                                                                                         
    ALTER TABLE evidences ADD COLUMN body TEXT NOT NULL DEFAULT '';                                                                                                        
                                                                                                                                                                           
  ### Evidence Request Table                                                                                                                                               
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/migrations/000035_create_evidence_request_table.up.sql                                                            
                                                                                                                                                                           
    CREATE TABLE IF NOT EXISTS evidence_requests (                                                                                                                         
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                                                                                                                     
        tenant_id UUID NOT NULL,                                                                                                                                           
        organization_id UUID NOT NULL REFERENCES organizations(id),                                                                                                        
        evidence_id UUID REFERENCES evidences(id),                                                                                                                         
        control_id UUID NOT NULL REFERENCES controls(id),                                                                                                                  
        requested_by UUID NOT NULL,                                                                                                                                        
        assigned_to UUID NOT NULL,                                                                                                                                         
        name TEXT NOT NULL,                                                                                                                                                
        description TEXT NOT NULL DEFAULT '',                                                                                                                              
        state TEXT NOT NULL DEFAULT 'open',                                                                                                                                
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),                                                                                                                     
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()                                                                                                                      
    );                                                                                                                                                                     
    CREATE INDEX IF NOT EXISTS idx_evidence_requests_organization_id ON evidence_requests (organization_id);                                                               
    CREATE INDEX IF NOT EXISTS idx_evidence_requests_evidence_id ON evidence_requests (evidence_id);                                                                       
    CREATE INDEX IF NOT EXISTS idx_evidence_requests_control_id ON evidence_requests (control_id);                                                                         
    ──────                                                                                                                                                                 
  ## 2. Go Struct Definitions                                                                                                                                              
                                                                                                                                                                           
  ### Evidence Model                                                                                                                                                       
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/evidence.go  (Lines 15-27)                                                                                        
                                                                                                                                                                           
    type Evidence struct {                                                                                                                                                 
        ID             uuid.UUID                                                                                                                                           
        TenantID       uuid.UUID                                                                                                                                           
        OrganizationID uuid.UUID                                                                                                                                           
        Name           string                                                                                                                                              
        Description    string                                                                                                                                              
        EvidenceType   EvidenceType                                                                                                                                        
        URL            string                                                                                                                                              
        Body           string                                                                                                                                              
        State          EvidenceState                                                                                                                                       
        ValidUntil     *time.Time                                                                                                                                          
        CreatedAt      time.Time                                                                                                                                           
        UpdatedAt      time.Time                                                                                                                                           
    }                                                                                                                                                                      
                                                                                                                                                                           
  ### EvidenceType Enum                                                                                                                                                    
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/evidence.go  (Lines 29-35)                                                                                        
                                                                                                                                                                           
    type EvidenceType string                                                                                                                                               
                                                                                                                                                                           
    const (                                                                                                                                                                
        EvidenceTypeDocument EvidenceType = "document"                                                                                                                     
        EvidenceTypeURL      EvidenceType = "url"                                                                                                                          
        EvidenceTypeBody     EvidenceType = "body"                                                                                                                         
    )                                                                                                                                                                      
                                                                                                                                                                           
  ### EvidenceState Enum                                                                                                                                                   
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/evidence.go  (Lines 37-44)                                                                                        
                                                                                                                                                                           
    type EvidenceState string                                                                                                                                              
                                                                                                                                                                           
    const (                                                                                                                                                                
        EvidenceStateDraft   EvidenceState = "draft"                                                                                                                       
        EvidenceStateValid   EvidenceState = "valid"                                                                                                                       
        EvidenceStateExpired EvidenceState = "expired"                                                                                                                     
    )                                                                                                                                                                      
                                                                                                                                                                           
  ### EvidenceFile Model                                                                                                                                                   
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/evidence.go  (Lines 46-55)                                                                                        
                                                                                                                                                                           
    type EvidenceFile struct {                                                                                                                                             
        ID          uuid.UUID                                                                                                                                              
        TenantID    uuid.UUID                                                                                                                                              
        EvidenceID  uuid.UUID                                                                                                                                              
        Name        string                                                                                                                                                 
        ContentType string                                                                                                                                                 
        Size        int64                                                                                                                                                  
        CreatedAt   time.Time                                                                                                                                              
        UpdatedAt   time.Time                                                                                                                                              
    }                                                                                                                                                                      
                                                                                                                                                                           
  ### EvidenceRequest Model                                                                                                                                                
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/evidence_request.go  (Lines 12-26)                                                                                
                                                                                                                                                                           
    type EvidenceRequest struct {                                                                                                                                          
        ID             uuid.UUID                                                                                                                                           
        TenantID       uuid.UUID                                                                                                                                           
        OrganizationID uuid.UUID                                                                                                                                           
        EvidenceID     *uuid.UUID                                                                                                                                          
        ControlID      uuid.UUID                                                                                                                                           
        RequestedBy    uuid.UUID                                                                                                                                           
        AssignedTo     uuid.UUID                                                                                                                                           
        Name           string                                                                                                                                              
        Description    string                                                                                                                                              
        State          EvidenceRequestState                                                                                                                                
        CreatedAt      time.Time                                                                                                                                           
        UpdatedAt      time.Time                                                                                                                                           
    }                                                                                                                                                                      
                                                                                                                                                                           
  ### EvidenceRequestState Enum                                                                                                                                            
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/evidence_request.go  (Lines 28-35)                                                                                
                                                                                                                                                                           
    type EvidenceRequestState string                                                                                                                                       
                                                                                                                                                                           
    const (                                                                                                                                                                
        EvidenceRequestStateOpen      EvidenceRequestState = "open"                                                                                                        
        EvidenceRequestStateFulfilled EvidenceRequestState = "fulfilled"                                                                                                   
        EvidenceRequestStateClosed    EvidenceRequestState = "closed"                                                                                                      
    )                                                                                                                                                                      
    ──────                                                                                                                                                                 
  ## 3. Relationships / Junction Tables                                                                                                                                    
                                                                                                                                                                           
  ### Control ↔ Evidence (Many-to-Many)                                                                                                                                    
                                                                                                                                                                           
  Via  controls_evidences  junction table. A control can have many evidences, and an evidence can belong to many controls.                                                 
                                                                                                                                                                           
  ### Task ↔ Evidence (Many-to-Many)                                                                                                                                       
                                                                                                                                                                           
  Via  task_evidences  junction table. Tasks can link to evidences and vice versa.                                                                                         
                                                                                                                                                                           
  ### Evidence → EvidenceFile (One-to-Many)                                                                                                                                
                                                                                                                                                                           
  Evidence has many files via  evidence_files.evidence_id  foreign key.                                                                                                    
                                                                                                                                                                           
  ### Evidence → Organization (Many-to-One)                                                                                                                                
                                                                                                                                                                           
  Via  evidences.organization_id  foreign key.                                                                                                                             
                                                                                                                                                                           
  ### EvidenceRequest → Evidence (Many-to-One, optional)                                                                                                                   
                                                                                                                                                                           
  Via  evidence_requests.evidence_id  nullable foreign key.                                                                                                                
                                                                                                                                                                           
  ### EvidenceRequest → Control (Many-to-One)                                                                                                                              
                                                                                                                                                                           
  Via  evidence_requests.control_id  foreign key.                                                                                                                          
  ──────                                                                                                                                                                   
  ## 4. Coredata / Repository Layer                                                                                                                                        
                                                                                                                                                                           
  ### Evidence Repository                                                                                                                                                  
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/coredata/evidence.go                                                                                              
                                                                                                                                                                           
  Key functions (with signatures):                                                                                                                                         
                                                                                                                                                                           
  •  CreateEvidence(ctx, evidence)  - Lines 15-53                                                                                                                          
  •  GetEvidenceByID(ctx, id)  - Lines 55-74                                                                                                                               
  •  ListEvidences(ctx, scoper, cursor, filters, orderFields)  - Lines 97-170                                                                                              
  •  UpdateEvidence(ctx, evidence)  - Lines 172-207                                                                                                                        
  •  DeleteEvidence(ctx, id)  - Lines 209-235                                                                                                                              
  •  LinkControlToEvidence(ctx, controlID, evidenceID)  - Lines 237-260                                                                                                    
  •  UnlinkControlFromEvidence(ctx, controlID, evidenceID)  - Lines 262-278                                                                                                
  •  LinkTaskToEvidence(ctx, taskID, evidenceID)  - Lines 280-303                                                                                                          
  •  UnlinkTaskFromEvidence(ctx, taskID, evidenceID)  - Lines 305-321                                                                                                      
  •  ListEvidencesByControlID(ctx, controlID, cursor)  - Lines 323-361                                                                                                     
  •  ListEvidencesByTaskID(ctx, taskID, cursor)  - Lines 363-401                                                                                                           
  •  ExpireEvidences(ctx)  - Lines 403-416                                                                                                                                 
                                                                                                                                                                           
  ### Evidence File Repository                                                                                                                                             
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/coredata/evidence_file.go                                                                                         
                                                                                                                                                                           
  Key functions:                                                                                                                                                           
                                                                                                                                                                           
  •  CreateEvidenceFile(ctx, evidenceFile)  - Lines 13-40                                                                                                                  
  •  GetEvidenceFileByID(ctx, id)  - Lines 42-62                                                                                                                           
  •  ListEvidenceFilesByEvidenceID(ctx, evidenceID, cursor)  - Lines 64-101                                                                                                
  •  DeleteEvidenceFile(ctx, id)  - Lines 103-118                                                                                                                          
                                                                                                                                                                           
  ### Evidence Request Repository                                                                                                                                          
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/coredata/evidence_request.go                                                                                      
                                                                                                                                                                           
  Key functions:                                                                                                                                                           
                                                                                                                                                                           
  •  CreateEvidenceRequest(ctx, req)  - Lines 15-54                                                                                                                        
  •  GetEvidenceRequestByID(ctx, id)  - Lines 56-79                                                                                                                        
  •  ListEvidenceRequests(ctx, scoper, cursor, filters, orderFields)  - Lines 81-158                                                                                       
  •  UpdateEvidenceRequest(ctx, req)  - Lines 160-199                                                                                                                      
  •  DeleteEvidenceRequest(ctx, id)  - Lines 201-227                                                                                                                       
  •  ListEvidenceRequestsByControlID(ctx, controlID, cursor)  - Lines 229-267                                                                                              
  •  ListEvidenceRequestsByEvidenceID(ctx, evidenceID, cursor)  - Lines 269-307                                                                                            
  ──────                                                                                                                                                                   
  ## 5. GraphQL Schema Definitions                                                                                                                                         
                                                                                                                                                                           
  ### Evidence Type                                                                                                                                                        
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/schema/evidence.graphqls                                                                                          
                                                                                                                                                                           
    enum EvidenceState {                                                                                                                                                   
      DRAFT                                                                                                                                                                
      VALID                                                                                                                                                                
      EXPIRED                                                                                                                                                              
    }                                                                                                                                                                      
                                                                                                                                                                           
    enum EvidenceType {                                                                                                                                                    
      DOCUMENT                                                                                                                                                             
      URL                                                                                                                                                                  
      BODY                                                                                                                                                                 
    }                                                                                                                                                                      
                                                                                                                                                                           
    type Evidence implements Node {                                                                                                                                        
      id: ID!                                                                                                                                                              
      name: String!                                                                                                                                                        
      description: String!                                                                                                                                                 
      evidenceType: EvidenceType!                                                                                                                                          
      url: String!                                                                                                                                                         
      body: String!                                                                                                                                                        
      state: EvidenceState!                                                                                                                                                
      validUntil: Date                                                                                                                                                     
      controls(after: CursorPaginationInput): ControlConnection!                                                                                                           
      tasks(after: CursorPaginationInput): TaskConnection!                                                                                                                 
      files(after: CursorPaginationInput): EvidenceFileConnection!                                                                                                         
      evidenceRequests(after: CursorPaginationInput): EvidenceRequestConnection!                                                                                           
      createdAt: DateTime!                                                                                                                                                 
      updatedAt: DateTime!                                                                                                                                                 
    }                                                                                                                                                                      
                                                                                                                                                                           
  ### Evidence Queries and Mutations                                                                                                                                       
                                                                                                                                                                           
  Queries:                                                                                                                                                                 
                                                                                                                                                                           
    extend type Query {                                                                                                                                                    
      evidence(id: ID!): Evidence!                                                                                                                                         
    }                                                                                                                                                                      
                                                                                                                                                                           
  Mutations:                                                                                                                                                               
                                                                                                                                                                           
    extend type Mutation {                                                                                                                                                 
      createEvidence(input: CreateEvidenceInput!): CreateEvidencePayload!                                                                                                  
      updateEvidence(input: UpdateEvidenceInput!): UpdateEvidencePayload!                                                                                                  
      deleteEvidence(input: DeleteEvidenceInput!): DeleteEvidencePayload!                                                                                                  
      linkControlToEvidence(input: LinkControlToEvidenceInput!): LinkControlToEvidencePayload!                                                                             
      unlinkControlFromEvidence(input: UnlinkControlFromEvidenceInput!): UnlinkControlFromEvidencePayload!                                                                 
      linkTaskToEvidence(input: LinkTaskToEvidenceInput!): LinkTaskToEvidencePayload!                                                                                      
      unlinkTaskFromEvidence(input: UnlinkTaskFromEvidenceInput!): UnlinkTaskFromEvidencePayload!                                                                          
    }                                                                                                                                                                      
                                                                                                                                                                           
  ### Input Types:                                                                                                                                                         
                                                                                                                                                                           
    input CreateEvidenceInput {                                                                                                                                            
      organizationId: ID!                                                                                                                                                  
      name: String!                                                                                                                                                        
      description: String                                                                                                                                                  
      evidenceType: EvidenceType                                                                                                                                           
      url: String                                                                                                                                                          
      body: String                                                                                                                                                         
      state: EvidenceState                                                                                                                                                 
      validUntil: Date                                                                                                                                                     
    }                                                                                                                                                                      
                                                                                                                                                                           
    input UpdateEvidenceInput {                                                                                                                                            
      id: ID!                                                                                                                                                              
      name: String                                                                                                                                                         
      description: String                                                                                                                                                  
      evidenceType: EvidenceType                                                                                                                                           
      url: String                                                                                                                                                          
      body: String                                                                                                                                                         
      state: EvidenceState                                                                                                                                                 
      validUntil: Date                                                                                                                                                     
    }                                                                                                                                                                      
                                                                                                                                                                           
    input DeleteEvidenceInput {                                                                                                                                            
      id: ID!                                                                                                                                                              
    }                                                                                                                                                                      
                                                                                                                                                                           
    input LinkControlToEvidenceInput {                                                                                                                                     
      controlId: ID!                                                                                                                                                       
      evidenceId: ID!                                                                                                                                                      
    }                                                                                                                                                                      
                                                                                                                                                                           
    input UnlinkControlFromEvidenceInput {                                                                                                                                 
      controlId: ID!                                                                                                                                                       
      evidenceId: ID!                                                                                                                                                      
    }                                                                                                                                                                      
                                                                                                                                                                           
    input LinkTaskToEvidenceInput {                                                                                                                                        
      taskId: ID!                                                                                                                                                          
      evidenceId: ID!                                                                                                                                                      
    }                                                                                                                                                                      
                                                                                                                                                                           
    input UnlinkTaskFromEvidenceInput {                                                                                                                                    
      taskId: ID!                                                                                                                                                          
      evidenceId: ID!                                                                                                                                                      
    }                                                                                                                                                                      
                                                                                                                                                                           
  ### Evidence File Type                                                                                                                                                   
                                                                                                                                                                           
    type EvidenceFile implements Node {                                                                                                                                    
      id: ID!                                                                                                                                                              
      name: String!                                                                                                                                                        
      contentType: String!                                                                                                                                                 
      size: Int!                                                                                                                                                           
      createdAt: DateTime!                                                                                                                                                 
      updatedAt: DateTime!                                                                                                                                                 
    }                                                                                                                                                                      
                                                                                                                                                                           
    extend type Mutation {                                                                                                                                                 
      deleteEvidenceFile(input: DeleteEvidenceFileInput!): DeleteEvidenceFilePayload!                                                                                      
    }                                                                                                                                                                      
                                                                                                                                                                           
  ### Evidence Request Type and Mutations                                                                                                                                  
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/schema/evidence_request.graphqls                                                                                  
                                                                                                                                                                           
    enum EvidenceRequestState {                                                                                                                                            
      OPEN                                                                                                                                                                 
      FULFILLED                                                                                                                                                            
      CLOSED                                                                                                                                                               
    }                                                                                                                                                                      
                                                                                                                                                                           
    type EvidenceRequest implements Node {                                                                                                                                 
      id: ID!                                                                                                                                                              
      evidence: Evidence                                                                                                                                                   
      control: Control!                                                                                                                                                    
      requestedBy: People!                                                                                                                                                 
      assignedTo: People!                                                                                                                                                  
      name: String!                                                                                                                                                        
      description: String!                                                                                                                                                 
      state: EvidenceRequestState!                                                                                                                                         
      createdAt: DateTime!                                                                                                                                                 
      updatedAt: DateTime!                                                                                                                                                 
    }                                                                                                                                                                      
                                                                                                                                                                           
    extend type Mutation {                                                                                                                                                 
      createEvidenceRequest(input: CreateEvidenceRequestInput!): CreateEvidenceRequestPayload!                                                                             
      updateEvidenceRequest(input: UpdateEvidenceRequestInput!): UpdateEvidenceRequestPayload!                                                                             
      deleteEvidenceRequest(input: DeleteEvidenceRequestInput!): DeleteEvidenceRequestPayload!                                                                             
    }                                                                                                                                                                      
                                                                                                                                                                           
    input CreateEvidenceRequestInput {                                                                                                                                     
      organizationId: ID!                                                                                                                                                  
      controlId: ID!                                                                                                                                                       
      assignedTo: ID!                                                                                                                                                      
      name: String!                                                                                                                                                        
      description: String                                                                                                                                                  
    }                                                                                                                                                                      
                                                                                                                                                                           
    input UpdateEvidenceRequestInput {                                                                                                                                     
      id: ID!                                                                                                                                                              
      evidenceId: ID                                                                                                                                                       
      assignedTo: ID                                                                                                                                                       
      name: String                                                                                                                                                         
      description: String                                                                                                                                                  
      state: EvidenceRequestState                                                                                                                                          
    }                                                                                                                                                                      
                                                                                                                                                                           
  ### Organization Connection to Evidences                                                                                                                                 
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/schema/organization.graphqls  (Line 17):                                                                          
                                                                                                                                                                           
    evidences(after: CursorPaginationInput, filters: EvidenceFilters, orderBy: EvidenceOrderInput): EvidenceConnection!                                                    
                                                                                                                                                                           
  ### Evidence Filters                                                                                                                                                     
                                                                                                                                                                           
    input EvidenceFilters {                                                                                                                                                
      states: [EvidenceState!]                                                                                                                                             
    }                                                                                                                                                                      
                                                                                                                                                                           
    input EvidenceOrderInput {                                                                                                                                             
      field: EvidenceOrderField!                                                                                                                                           
      direction: OrderDirection!                                                                                                                                           
    }                                                                                                                                                                      
                                                                                                                                                                           
    enum EvidenceOrderField {                                                                                                                                              
      NAME                                                                                                                                                                 
      CREATED_AT                                                                                                                                                           
      UPDATED_AT                                                                                                                                                           
    }                                                                                                                                                                      
    ──────                                                                                                                                                                 
  ## 6. Validity/Staleness Tracking                                                                                                                                        
                                                                                                                                                                           
  ### ExpireEvidences Function                                                                                                                                             
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/coredata/evidence.go  (Lines 403-416)                                                                             
                                                                                                                                                                           
    func (s *coredata) ExpireEvidences(ctx context.Context) error {                                                                                                        
        _, err := s.db.ExecContext(ctx, `                                                                                                                                  
            UPDATE evidences                                                                                                                                               
            SET state = 'expired', updated_at = now()                                                                                                                      
            WHERE valid_until IS NOT NULL                                                                                                                                  
            AND valid_until < CURRENT_DATE                                                                                                                                 
            AND state != 'expired'                                                                                                                                         
        `)                                                                                                                                                                 
        if err != nil {                                                                                                                                                    
            return fmt.Errorf("expire evidences: %w", err)                                                                                                                 
        }                                                                                                                                                                  
        return nil                                                                                                                                                         
    }                                                                                                                                                                      
                                                                                                                                                                           
  ### Evidence Expiry Worker                                                                                                                                               
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/server.go  (Lines 162-181)                                                                                        
                                                                                                                                                                           
    evidenceExpiryWorker := worker.New(                                                                                                                                    
        logger.With(slog.String("worker", "evidence_expiry")),                                                                                                             
        worker.PollFunc(func(ctx context.Context) (int, error) {                                                                                                           
            err := core.ExpireEvidences(ctx)                                                                                                                               
            if err != nil {                                                                                                                                                
                return 0, fmt.Errorf("expire evidences: %w", err)                                                                                                          
            }                                                                                                                                                              
            return 0, nil                                                                                                                                                  
        }),                                                                                                                                                                
        worker.WithPollInterval(1*time.Hour),                                                                                                                              
    )                                                                                                                                                                      
                                                                                                                                                                           
  This means there IS an automated evidence validity tracker. The system:                                                                                                  
                                                                                                                                                                           
  1. Has a  valid_until  date field on evidences                                                                                                                           
  2. Has a background worker that polls every hour                                                                                                                         
  3. Automatically transitions evidence state from any non-expired state to  expired  when  valid_until < CURRENT_DATE                                                     
  ──────                                                                                                                                                                   
  ## Summary of Entity Relationships                                                                                                                                       
                                                                                                                                                                           
    Organization (1) ──── (N) Evidence                                                                                                                                     
    Evidence     (N) ──── (N) Control      (via controls_evidences)                                                                                                        
    Evidence     (N) ──── (N) Task         (via task_evidences)                                                                                                            
    Evidence     (1) ──── (N) EvidenceFile                                                                                                                                 
    Evidence     (1) ──── (N) EvidenceRequest                                                                                                                              
    Control      (1) ──── (N) EvidenceRequest                                                                                                                              
                                                                                                                                                                           
  [MESSAGE FROM SUBAGENT (Document Schema Researcher - a8182fff-0d57-4249-a9f7-1f48449bb6c7)]: Here are all findings regarding the document system in the Probo codebase   
  and its comparison with the evidence system:                                                                                                                             
  ──────                                                                                                                                                                   
  ## 1. SQL Migration Files for Documents / Policies / Procedures                                                                                                          
                                                                                                                                                                           
  ### Documents Table (Policy/Procedure)                                                                                                                                   
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/migrations/000030_create_documents_table.up.sql                                                                   
                                                                                                                                                                           
    CREATE TABLE IF NOT EXISTS documents (                                                                                                                                 
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),                                                                                                                     
        tenant_id UUID NOT NULL,                                                                                                                                           
        organization_id UUID NOT NULL REFERENCES organizations(id),                                                                                                        
        name TEXT NOT NULL,                                                                                                                                                
        content TEXT NOT NULL DEFAULT '',                                                                                                                                  
        document_type TEXT NOT NULL DEFAULT 'policy',                                                                                                                      
        status TEXT NOT NULL DEFAULT 'draft',                                                                                                                              
        review_date DATE,                                                                                                                                                  
        owner_id UUID REFERENCES peoples(id),                                                                                                                              
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),                                                                                                                     
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()                                                                                                                      
    );                                                                                                                                                                     
    CREATE INDEX IF NOT EXISTS idx_documents_organization_id ON documents (organization_id);                                                                               
                                                                                                                                                                           
  ### Controls-Documents Junction Table                                                                                                                                    
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/migrations/000031_create_controls_documents_table.up.sql                                                          
                                                                                                                                                                           
    CREATE TABLE IF NOT EXISTS controls_documents (                                                                                                                        
        control_id UUID NOT NULL REFERENCES controls(id),                                                                                                                  
        document_id UUID NOT NULL REFERENCES documents(id),                                                                                                                
        PRIMARY KEY (control_id, document_id)                                                                                                                              
    );                                                                                                                                                                     
    CREATE INDEX IF NOT EXISTS idx_controls_documents_document_id ON controls_documents (document_id);                                                                     
    CREATE INDEX IF NOT EXISTS idx_controls_documents_control_id ON controls_documents (control_id);                                                                       
    ──────                                                                                                                                                                 
  ## 2. Go Struct Definitions for Documents                                                                                                                                
                                                                                                                                                                           
  ### Document Model                                                                                                                                                       
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/document.go  (Lines 13-26)                                                                                        
                                                                                                                                                                           
    type Document struct {                                                                                                                                                 
        ID             uuid.UUID                                                                                                                                           
        TenantID       uuid.UUID                                                                                                                                           
        OrganizationID uuid.UUID                                                                                                                                           
        Name           string                                                                                                                                              
        Content        string                                                                                                                                              
        DocumentType   DocumentType                                                                                                                                        
        Status         DocumentStatus                                                                                                                                      
        ReviewDate     *time.Time                                                                                                                                          
        OwnerID        *uuid.UUID                                                                                                                                          
        CreatedAt      time.Time                                                                                                                                           
        UpdatedAt      time.Time                                                                                                                                           
    }                                                                                                                                                                      
                                                                                                                                                                           
  ### DocumentType Enum                                                                                                                                                    
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/document.go  (Lines 28-33)                                                                                        
                                                                                                                                                                           
    type DocumentType string                                                                                                                                               
                                                                                                                                                                           
    const (                                                                                                                                                                
        DocumentTypePolicy    DocumentType = "policy"                                                                                                                      
        DocumentTypeProcedure DocumentType = "procedure"                                                                                                                   
    )                                                                                                                                                                      
                                                                                                                                                                           
  ### DocumentStatus Enum                                                                                                                                                  
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/document.go  (Lines 35-42)                                                                                        
                                                                                                                                                                           
    type DocumentStatus string                                                                                                                                             
                                                                                                                                                                           
    const (                                                                                                                                                                
        DocumentStatusDraft     DocumentStatus = "draft"                                                                                                                   
        DocumentStatusPublished DocumentStatus = "published"                                                                                                               
        DocumentStatusArchived  DocumentStatus = "archived"                                                                                                                
    )                                                                                                                                                                      
    ──────                                                                                                                                                                 
  ## 3. GraphQL Schema for Documents                                                                                                                                       
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/schema/document.graphqls                                                                                          
                                                                                                                                                                           
    enum DocumentType {                                                                                                                                                    
      POLICY                                                                                                                                                               
      PROCEDURE                                                                                                                                                            
    }                                                                                                                                                                      
                                                                                                                                                                           
    enum DocumentStatus {                                                                                                                                                  
      DRAFT                                                                                                                                                                
      PUBLISHED                                                                                                                                                            
      ARCHIVED                                                                                                                                                             
    }                                                                                                                                                                      
                                                                                                                                                                           
    type Document implements Node {                                                                                                                                        
      id: ID!                                                                                                                                                              
      name: String!                                                                                                                                                        
      content: String!                                                                                                                                                     
      documentType: DocumentType!                                                                                                                                          
      status: DocumentStatus!                                                                                                                                              
      reviewDate: Date                                                                                                                                                     
      owner: People                                                                                                                                                        
      controls(after: CursorPaginationInput): ControlConnection!                                                                                                           
      createdAt: DateTime!                                                                                                                                                 
      updatedAt: DateTime!                                                                                                                                                 
    }                                                                                                                                                                      
                                                                                                                                                                           
    extend type Query {                                                                                                                                                    
      document(id: ID!): Document!                                                                                                                                         
    }                                                                                                                                                                      
                                                                                                                                                                           
    extend type Mutation {                                                                                                                                                 
      createDocument(input: CreateDocumentInput!): CreateDocumentPayload!                                                                                                  
      updateDocument(input: UpdateDocumentInput!): UpdateDocumentPayload!                                                                                                  
      deleteDocument(input: DeleteDocumentInput!): DeleteDocumentPayload!                                                                                                  
      linkControlToDocument(input: LinkControlToDocumentInput!): LinkControlToDocumentPayload!                                                                             
      unlinkControlFromDocument(input: UnlinkControlFromDocumentInput!): UnlinkControlFromDocumentPayload!                                                                 
    }                                                                                                                                                                      
                                                                                                                                                                           
    input CreateDocumentInput {                                                                                                                                            
      organizationId: ID!                                                                                                                                                  
      name: String!                                                                                                                                                        
      content: String                                                                                                                                                      
      documentType: DocumentType                                                                                                                                           
      status: DocumentStatus                                                                                                                                               
      reviewDate: Date                                                                                                                                                     
      ownerId: ID                                                                                                                                                          
    }                                                                                                                                                                      
                                                                                                                                                                           
    input UpdateDocumentInput {                                                                                                                                            
      id: ID!                                                                                                                                                              
      name: String                                                                                                                                                         
      content: String                                                                                                                                                      
      documentType: DocumentType                                                                                                                                           
      status: DocumentStatus                                                                                                                                               
      reviewDate: Date                                                                                                                                                     
      ownerId: ID                                                                                                                                                          
    }                                                                                                                                                                      
                                                                                                                                                                           
    input DeleteDocumentInput {                                                                                                                                            
      id: ID!                                                                                                                                                              
    }                                                                                                                                                                      
                                                                                                                                                                           
    input LinkControlToDocumentInput {                                                                                                                                     
      controlId: ID!                                                                                                                                                       
      documentId: ID!                                                                                                                                                      
    }                                                                                                                                                                      
                                                                                                                                                                           
    input UnlinkControlFromDocumentInput {                                                                                                                                 
      controlId: ID!                                                                                                                                                       
      documentId: ID!                                                                                                                                                      
    }                                                                                                                                                                      
                                                                                                                                                                           
  ### Organization Connection to Documents                                                                                                                                 
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/schema/organization.graphqls  (Line 18):                                                                          
                                                                                                                                                                           
    documents(after: CursorPaginationInput, filters: DocumentFilters, orderBy: DocumentOrderInput): DocumentConnection!                                                    
                                                                                                                                                                           
  ### Document Filters                                                                                                                                                     
                                                                                                                                                                           
    input DocumentFilters {                                                                                                                                                
      documentTypes: [DocumentType!]                                                                                                                                       
      statuses: [DocumentStatus!]                                                                                                                                          
    }                                                                                                                                                                      
                                                                                                                                                                           
    input DocumentOrderInput {                                                                                                                                             
      field: DocumentOrderField!                                                                                                                                           
      direction: OrderDirection!                                                                                                                                           
    }                                                                                                                                                                      
                                                                                                                                                                           
    enum DocumentOrderField {                                                                                                                                              
      NAME                                                                                                                                                                 
      CREATED_AT                                                                                                                                                           
      UPDATED_AT                                                                                                                                                           
    }                                                                                                                                                                      
    ──────                                                                                                                                                                 
  ## 4. Document Coredata/Repository Layer                                                                                                                                 
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/coredata/document.go                                                                                              
                                                                                                                                                                           
  Key functions:                                                                                                                                                           
                                                                                                                                                                           
  •  CreateDocument(ctx, document)  - Lines 15-50                                                                                                                          
  •  GetDocumentByID(ctx, id)  - Lines 52-73                                                                                                                               
  •  ListDocuments(ctx, scoper, cursor, filters, orderFields)  - Lines 100-173                                                                                             
  •  UpdateDocument(ctx, document)  - Lines 175-214                                                                                                                        
  •  DeleteDocument(ctx, id)  - Lines 216-243                                                                                                                              
  •  LinkControlToDocument(ctx, controlID, documentID)  - Lines 245-268                                                                                                    
  •  UnlinkControlFromDocument(ctx, controlID, documentID)  - Lines 270-286                                                                                                
  •  ListDocumentsByControlID(ctx, controlID, cursor)  - Lines 288-326                                                                                                     
  ──────                                                                                                                                                                   
  ## 5. Key Differences: Evidence vs Document                                                                                                                              
                                                                                                                                                                           
  ### They are separate entities in completely different tables                                                                                                            
                                                                                                                                                                           
   Aspect                                                 │ Evidence                                               │ Document
  ────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────
   Table                                                  │  evidences                                             │  documents 
   Purpose                                                │ Proof/attestation that a control is met                │ Formal policy/procedure documentation
   Types                                                  │  document ,  url ,  body                               │  policy ,  procedure 
   States                                                 │  draft ,  valid ,  expired                             │  draft ,  published ,  archived 
   Validity                                               │  valid_until  date with auto-expiry                    │  review_date  (no auto-expiry)
   File Attachments                                       │ Yes ( evidence_files  table)                           │ No (inline  content  field instead)
   Task Linking                                           │ Yes ( task_evidences )                                 │ No
   Request Workflow                                       │ Yes ( evidence_requests )                              │ No
   Owner                                                  │ No owner field                                         │ Has  owner_id  field
   Content Model                                          │ File-based or URL or body text                         │ Rich text  content  field
                                                                                                                                                                           
  ### Both share:                                                                                                                                                          
                                                                                                                                                                           
  • Control linking (via separate junction tables:  controls_evidences  and  controls_documents )                                                                          
  • Organization scoping                                                                                                                                                   
  • Tenant isolation                                                                                                                                                       
  • Cursor pagination and filtering in GraphQL                                                                                                                             
  ──────                                                                                                                                                                   
  ## 6. File Upload/Attachment Mechanisms                                                                                                                                  
                                                                                                                                                                           
  ### Evidence Files                                                                                                                                                       
                                                                                                                                                                           
  Evidence has a dedicated  evidence_files  table for file attachments. Evidence files are uploaded/downloaded via HTTP endpoints:                                         
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/server.go  (Lines 217-218)                                                                                        
                                                                                                                                                                           
    mux.Handle("POST /upload/evidence/{evidenceId}/file", ...)                                                                                                             
    mux.Handle("GET /download/evidence-file/{evidenceFileId}", ...)                                                                                                        
                                                                                                                                                                           
  ### Documents                                                                                                                                                            
                                                                                                                                                                           
  Documents do NOT have file attachments. They use an inline  content  text field for rich text content (like a markdown body for the policy/procedure).                   
  ──────                                                                                                                                                                   
  ## Summary                                                                                                                                                               
                                                                                                                                                                           
  Evidence and Documents are fundamentally different entities:                                                                                                             
                                                                                                                                                                           
  • Documents = Policies and Procedures (formal governance documentation with content, ownership, and review cycles)                                                       
  • Evidences = Proof artifacts (files, URLs, or text bodies that demonstrate compliance with controls, with validity tracking and expiry automation)                      
                                                                                                                                                                           
  They are not the same and do not share any tables, though both can be linked to Controls.                                                                                
                                                                                                                                                                           
  [MESSAGE FROM SUBAGENT (Evidence API Researcher - 9e25caad-8db5-4faf-83b2-7435ba65428b)]: Here are all findings related to the Evidence API endpoints, resolvers, and    
  related infrastructure:                                                                                                                                                  
  ──────                                                                                                                                                                   
  ## 1. GraphQL Resolvers for Evidence                                                                                                                                     
                                                                                                                                                                           
  ### Evidence Query Resolver                                                                                                                                              
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/resolvers/evidence.resolvers.go                                                                                   
                                                                                                                                                                           
  Key resolver functions:                                                                                                                                                  
                                                                                                                                                                           
  #### CreateEvidence (Line 19)                                                                                                                                            
                                                                                                                                                                           
    func (r *mutationResolver) CreateEvidence(ctx context.Context, input model.CreateEvidenceInput) (*model.CreateEvidencePayload, error)                                  
                                                                                                                                                                           
  #### UpdateEvidence (Line 66)                                                                                                                                            
                                                                                                                                                                           
    func (r *mutationResolver) UpdateEvidence(ctx context.Context, input model.UpdateEvidenceInput) (*model.UpdateEvidencePayload, error)                                  
                                                                                                                                                                           
  #### DeleteEvidence (Line 120)                                                                                                                                           
                                                                                                                                                                           
    func (r *mutationResolver) DeleteEvidence(ctx context.Context, input model.DeleteEvidenceInput) (*model.DeleteEvidencePayload, error)                                  
                                                                                                                                                                           
  #### LinkControlToEvidence (Line 140)                                                                                                                                    
                                                                                                                                                                           
    func (r *mutationResolver) LinkControlToEvidence(ctx context.Context, input model.LinkControlToEvidenceInput) (*model.LinkControlToEvidencePayload, error)             
                                                                                                                                                                           
  #### UnlinkControlFromEvidence (Line 162)                                                                                                                                
                                                                                                                                                                           
    func (r *mutationResolver) UnlinkControlFromEvidence(ctx context.Context, input model.UnlinkControlFromEvidenceInput) (*model.UnlinkControlFromEvidencePayload, error) 
                                                                                                                                                                           
  #### LinkTaskToEvidence (Line 180)                                                                                                                                       
                                                                                                                                                                           
    func (r *mutationResolver) LinkTaskToEvidence(ctx context.Context, input model.LinkTaskToEvidenceInput) (*model.LinkTaskToEvidencePayload, error)                      
                                                                                                                                                                           
  #### UnlinkTaskFromEvidence (Line 202)                                                                                                                                   
                                                                                                                                                                           
    func (r *mutationResolver) UnlinkTaskFromEvidence(ctx context.Context, input model.UnlinkTaskFromEvidenceInput) (*model.UnlinkTaskFromEvidencePayload, error)          
                                                                                                                                                                           
  #### Query - Evidence (Line 220)                                                                                                                                         
                                                                                                                                                                           
    func (r *queryResolver) Evidence(ctx context.Context, id string) (*server.Evidence, error)                                                                             
                                                                                                                                                                           
  #### Field Resolvers (on Evidence type):                                                                                                                                 
                                                                                                                                                                           
  •  Controls  (Line 236) - resolves paginated controls linked to evidence                                                                                                 
  •  Tasks  (Line 259) - resolves paginated tasks linked to evidence                                                                                                       
  •  Files  (Line 282) - resolves paginated evidence files                                                                                                                 
  •  EvidenceRequests  (Line 305) - resolves paginated evidence requests                                                                                                   
  ──────                                                                                                                                                                   
  ### Evidence File Resolver                                                                                                                                               
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/resolvers/evidence_file.resolvers.go                                                                              
                                                                                                                                                                           
  #### DeleteEvidenceFile (Line 17)                                                                                                                                        
                                                                                                                                                                           
    func (r *mutationResolver) DeleteEvidenceFile(ctx context.Context, input model.DeleteEvidenceFileInput) (*model.DeleteEvidenceFilePayload, error)                      
    ──────                                                                                                                                                                 
  ### Evidence Request Resolvers                                                                                                                                           
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/resolvers/evidence_request.resolvers.go                                                                           
                                                                                                                                                                           
  #### CreateEvidenceRequest (Line 19)                                                                                                                                     
                                                                                                                                                                           
    func (r *mutationResolver) CreateEvidenceRequest(ctx context.Context, input model.CreateEvidenceRequestInput) (*model.CreateEvidenceRequestPayload, error)             
                                                                                                                                                                           
  #### UpdateEvidenceRequest (Line 53)                                                                                                                                     
                                                                                                                                                                           
    func (r *mutationResolver) UpdateEvidenceRequest(ctx context.Context, input model.UpdateEvidenceRequestInput) (*model.UpdateEvidenceRequestPayload, error)             
                                                                                                                                                                           
  #### DeleteEvidenceRequest (Line 99)                                                                                                                                     
                                                                                                                                                                           
    func (r *mutationResolver) DeleteEvidenceRequest(ctx context.Context, input model.DeleteEvidenceRequestInput) (*model.DeleteEvidenceRequestPayload, error)             
                                                                                                                                                                           
  #### Field Resolvers (on EvidenceRequest type):                                                                                                                          
                                                                                                                                                                           
  •  Evidence  (Line 119) - resolves the linked evidence (nullable)                                                                                                        
  •  Control  (Line 137) - resolves the linked control                                                                                                                     
  •  RequestedBy  (Line 148) - resolves the requesting person                                                                                                              
  •  AssignedTo  (Line 159) - resolves the assigned person                                                                                                                 
  ──────                                                                                                                                                                   
  ## 2. HTTP Endpoints (File Upload/Download)                                                                                                                              
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/server.go  (Lines 217-218)                                                                                        
                                                                                                                                                                           
    mux.Handle("POST /upload/evidence/{evidenceId}/file", httpserver.AuthMiddleware(httpserver.HandleEvidenceFileUpload(core, objectStorage)))                             
    mux.Handle("GET /download/evidence-file/{evidenceFileId}", httpserver.AuthMiddleware(httpserver.HandleEvidenceFileDownload(core, objectStorage)))                      
                                                                                                                                                                           
  ### Upload Handler                                                                                                                                                       
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/httpserver/evidence_file_upload.go                                                                                
                                                                                                                                                                           
    func HandleEvidenceFileUpload(core *coredata.Coredata, objectStorage server.ObjectStorage) http.Handler                                                                
                                                                                                                                                                           
  • Endpoint:  POST /upload/evidence/{evidenceId}/file                                                                                                                     
  • Content-Type:  multipart/form-data                                                                                                                                     
  • Form Field:  file  (the file to upload)                                                                                                                                
  • Max file size: 10 MB (10 << 20 bytes)                                                                                                                                  
  • Process:                                                                                                                                                               
      1. Parses multipart form data                                                                                                                                        
      2. Extracts file from the  file  form field                                                                                                                          
      3. Creates an  EvidenceFile  record in the database                                                                                                                  
      4. Stores the file content in object storage using key format:  evidence-files/{evidenceFileID}                                                                      
      5. Returns JSON with the created evidence file details                                                                                                               
                                                                                                                                                                           
                                                                                                                                                                           
  ### Download Handler                                                                                                                                                     
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/httpserver/evidence_file_download.go                                                                              
                                                                                                                                                                           
    func HandleEvidenceFileDownload(core *coredata.Coredata, objectStorage server.ObjectStorage) http.Handler                                                              
                                                                                                                                                                           
  • Endpoint:  GET /download/evidence-file/{evidenceFileId}                                                                                                                
  • Process:                                                                                                                                                               
      1. Looks up the evidence file by ID from the database                                                                                                                
      2. Retrieves file content from object storage using key:  evidence-files/{evidenceFileID}                                                                            
      3. Sets  Content-Disposition: attachment; filename="<name>"  header                                                                                                  
      4. Sets  Content-Type  header from the stored content type                                                                                                           
      5. Streams the file content to the client                                                                                                                            
                                                                                                                                                                           
  ──────                                                                                                                                                                   
  ## 3. MCP API Surface for Evidence                                                                                                                                       
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/mcp/specification.yaml                                                                                                   
                                                                                                                                                                           
  ### MCP Tools Related to Evidence:                                                                                                                                       
                                                                                                                                                                           
  #### list_evidences (Line ~408-444)                                                                                                                                      
                                                                                                                                                                           
    - name: list_evidences                                                                                                                                                 
      description: "List all evidences in an organization."                                                                                                                
      inputSchema:                                                                                                                                                         
        type: object                                                                                                                                                       
        properties:                                                                                                                                                        
          organization_id:                                                                                                                                                 
            type: string                                                                                                                                                   
            description: "The ID of the organization."                                                                                                                     
        required:                                                                                                                                                          
          - organization_id                                                                                                                                                
                                                                                                                                                                           
  #### get_evidence (Line ~446-482)                                                                                                                                        
                                                                                                                                                                           
    - name: get_evidence                                                                                                                                                   
      description: "Get a specific evidence by ID."                                                                                                                        
      inputSchema:                                                                                                                                                         
        type: object                                                                                                                                                       
        properties:                                                                                                                                                        
          evidence_id:                                                                                                                                                     
            type: string                                                                                                                                                   
            description: "The ID of the evidence."                                                                                                                         
        required:                                                                                                                                                          
          - evidence_id                                                                                                                                                    
                                                                                                                                                                           
  #### create_evidence (Line ~484-530)                                                                                                                                     
                                                                                                                                                                           
    - name: create_evidence                                                                                                                                                
      description: "Create a new evidence in an organization."                                                                                                             
      inputSchema:                                                                                                                                                         
        type: object                                                                                                                                                       
        properties:                                                                                                                                                        
          organization_id:                                                                                                                                                 
            type: string                                                                                                                                                   
          name:                                                                                                                                                            
            type: string                                                                                                                                                   
          description:                                                                                                                                                     
            type: string                                                                                                                                                   
          evidence_type:                                                                                                                                                   
            type: string                                                                                                                                                   
            enum: [document, url, body]                                                                                                                                    
          url:                                                                                                                                                             
            type: string                                                                                                                                                   
          body:                                                                                                                                                            
            type: string                                                                                                                                                   
          state:                                                                                                                                                           
            type: string                                                                                                                                                   
            enum: [draft, valid, expired]                                                                                                                                  
          valid_until:                                                                                                                                                     
            type: string                                                                                                                                                   
            description: "Date in YYYY-MM-DD format"                                                                                                                       
        required:                                                                                                                                                          
          - organization_id                                                                                                                                                
          - name                                                                                                                                                           
                                                                                                                                                                           
  #### update_evidence (Line ~532-578)                                                                                                                                     
                                                                                                                                                                           
    - name: update_evidence                                                                                                                                                
      description: "Update an existing evidence."                                                                                                                          
      inputSchema:                                                                                                                                                         
        type: object                                                                                                                                                       
        properties:                                                                                                                                                        
          evidence_id:                                                                                                                                                     
            type: string                                                                                                                                                   
          name:                                                                                                                                                            
            type: string                                                                                                                                                   
          description:                                                                                                                                                     
            type: string                                                                                                                                                   
          evidence_type:                                                                                                                                                   
            type: string                                                                                                                                                   
            enum: [document, url, body]                                                                                                                                    
          url:                                                                                                                                                             
            type: string                                                                                                                                                   
          body:                                                                                                                                                            
            type: string                                                                                                                                                   
          state:                                                                                                                                                           
            type: string                                                                                                                                                   
            enum: [draft, valid, expired]                                                                                                                                  
          valid_until:                                                                                                                                                     
            type: string                                                                                                                                                   
        required:                                                                                                                                                          
          - evidence_id                                                                                                                                                    
                                                                                                                                                                           
  #### delete_evidence (Line ~580-596)                                                                                                                                     
                                                                                                                                                                           
    - name: delete_evidence                                                                                                                                                
      description: "Delete an evidence."                                                                                                                                   
      inputSchema:                                                                                                                                                         
        type: object                                                                                                                                                       
        properties:                                                                                                                                                        
          evidence_id:                                                                                                                                                     
            type: string                                                                                                                                                   
        required:                                                                                                                                                          
          - evidence_id                                                                                                                                                    
                                                                                                                                                                           
  #### link_evidence_to_control (Line ~598-618)                                                                                                                            
                                                                                                                                                                           
    - name: link_evidence_to_control                                                                                                                                       
      description: "Link an evidence to a control."                                                                                                                        
      inputSchema:                                                                                                                                                         
        type: object                                                                                                                                                       
        properties:                                                                                                                                                        
          evidence_id:                                                                                                                                                     
            type: string                                                                                                                                                   
          control_id:                                                                                                                                                      
            type: string                                                                                                                                                   
        required:                                                                                                                                                          
          - evidence_id                                                                                                                                                    
          - control_id                                                                                                                                                     
                                                                                                                                                                           
  #### unlink_evidence_from_control (Line ~620-640)                                                                                                                        
                                                                                                                                                                           
    - name: unlink_evidence_from_control                                                                                                                                   
      description: "Unlink an evidence from a control."                                                                                                                    
      inputSchema:                                                                                                                                                         
        type: object                                                                                                                                                       
        properties:                                                                                                                                                        
          evidence_id:                                                                                                                                                     
            type: string                                                                                                                                                   
          control_id:                                                                                                                                                      
            type: string                                                                                                                                                   
        required:                                                                                                                                                          
          - evidence_id                                                                                                                                                    
          - control_id                                                                                                                                                     
    ──────                                                                                                                                                                 
  ## 4. CLI Commands for Evidence                                                                                                                                          
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/cmd/cli/cmd/evidence.go                                                                                                           
                                                                                                                                                                           
  The CLI has an  evidence  command group with subcommands:                                                                                                                
                                                                                                                                                                           
  #### List Evidences                                                                                                                                                      
                                                                                                                                                                           
    func newEvidenceListCmd() *cobra.Command                                                                                                                               
                                                                                                                                                                           
  • Command:  probo evidence list                                                                                                                                          
  • Flags:  --organization-id  (required)                                                                                                                                  
                                                                                                                                                                           
  #### Get Evidence                                                                                                                                                        
                                                                                                                                                                           
    func newEvidenceGetCmd() *cobra.Command                                                                                                                                
                                                                                                                                                                           
  • Command:  probo evidence get                                                                                                                                           
  • Flags:  --id  (required)                                                                                                                                               
                                                                                                                                                                           
  #### Create Evidence                                                                                                                                                     
                                                                                                                                                                           
    func newEvidenceCreateCmd() *cobra.Command                                                                                                                             
                                                                                                                                                                           
  • Command:  probo evidence create                                                                                                                                        
  • Flags:  --organization-id ,  --name ,  --description ,  --evidence-type ,  --url ,  --body ,  --state ,  --valid-until                                                 
                                                                                                                                                                           
  #### Update Evidence                                                                                                                                                     
                                                                                                                                                                           
    func newEvidenceUpdateCmd() *cobra.Command                                                                                                                             
                                                                                                                                                                           
  • Command:  probo evidence update                                                                                                                                        
  • Flags:  --id ,  --name ,  --description ,  --evidence-type ,  --url ,  --body ,  --state ,  --valid-until                                                              
                                                                                                                                                                           
  #### Delete Evidence                                                                                                                                                     
                                                                                                                                                                           
    func newEvidenceDeleteCmd() *cobra.Command                                                                                                                             
                                                                                                                                                                           
  • Command:  probo evidence delete                                                                                                                                        
  • Flags:  --id                                                                                                                                                           
  ──────                                                                                                                                                                   
  ## 5. Evidence Expiry Worker (Background Job)                                                                                                                            
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/server.go  (Lines 162-181)                                                                                        
                                                                                                                                                                           
    evidenceExpiryWorker := worker.New(                                                                                                                                    
        logger.With(slog.String("worker", "evidence_expiry")),                                                                                                             
        worker.PollFunc(func(ctx context.Context) (int, error) {                                                                                                           
            err := core.ExpireEvidences(ctx)                                                                                                                               
            if err != nil {                                                                                                                                                
                return 0, fmt.Errorf("expire evidences: %w", err)                                                                                                          
            }                                                                                                                                                              
            return 0, nil                                                                                                                                                  
        }),                                                                                                                                                                
        worker.WithPollInterval(1*time.Hour),                                                                                                                              
    )                                                                                                                                                                      
                                                                                                                                                                           
  The worker:                                                                                                                                                              
                                                                                                                                                                           
  • Runs as a background poll-based worker                                                                                                                                 
  • Polls every 1 hour                                                                                                                                                     
  • Calls  ExpireEvidences()  which runs:                                                                                                                                  
                                                                                                                                                                           
    UPDATE evidences                                                                                                                                                       
    SET state = 'expired', updated_at = now()                                                                                                                              
    WHERE valid_until IS NOT NULL                                                                                                                                          
    AND valid_until < CURRENT_DATE                                                                                                                                         
    AND state != 'expired'                                                                                                                                                 
                                                                                                                                                                           
  • Automatically expires any evidence where  valid_until  date has passed                                                                                                 
  ──────                                                                                                                                                                   
  ## 6. Organization Resolver for Evidences                                                                                                                                
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/resolvers/organization.resolvers.go                                                                               
                                                                                                                                                                           
    func (r *organizationResolver) Evidences(ctx context.Context, obj *server.Organization, after *model.CursorPaginationInput, filters *model.EvidenceFilters, orderBy    
  *model.EvidenceOrderInput) (*model.EvidenceConnection, error)                                                                                                            
                                                                                                                                                                           
  This allows querying evidences through the organization:                                                                                                                 
                                                                                                                                                                           
    query {                                                                                                                                                                
      organization(id: "...") {                                                                                                                                            
        evidences(filters: { states: [VALID] }, orderBy: { field: NAME, direction: ASC }) {                                                                                
          edges {                                                                                                                                                          
            node {                                                                                                                                                         
              id                                                                                                                                                           
              name                                                                                                                                                         
              state                                                                                                                                                        
              validUntil                                                                                                                                                   
            }                                                                                                                                                              
          }                                                                                                                                                                
        }                                                                                                                                                                  
      }                                                                                                                                                                    
    }                                                                                                                                                                      
    ──────                                                                                                                                                                 
  ## 7. Control Resolver for Evidences                                                                                                                                     
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/resolvers/control.resolvers.go                                                                                    
                                                                                                                                                                           
    func (r *controlResolver) Evidences(ctx context.Context, obj *server.Control, after *model.CursorPaginationInput) (*model.EvidenceConnection, error)                   
                                                                                                                                                                           
  Controls can also list their linked evidences.                                                                                                                           
  ──────                                                                                                                                                                   
  ## 8. Task Resolver for Evidences                                                                                                                                        
                                                                                                                                                                           
  File:  /home/at-the-prime/coding/probo/internal/server/resolvers/task.resolvers.go                                                                                       
                                                                                                                                                                           
    func (r *taskResolver) Evidences(ctx context.Context, obj *server.Task, after *model.CursorPaginationInput) (*model.EvidenceConnection, error)                         
                                                                                                                                                                           
  Tasks can also list their linked evidences.                                                                                                                              
  ──────                                                                                                                                                                   
  ## Summary of All Evidence-Related API Surfaces                                                                                                                          
                                                                                                                                                                           
  ### GraphQL Queries                                                                                                                                                      
                                                                                                                                                                           
   Query                                                  │ Input                                                  │ Returns
  ────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────
    evidence(id: ID!)                                     │ Evidence ID                                            │  Evidence! 
    organization.evidences(...)                           │ Filters, pagination, ordering                          │  EvidenceConnection! 
    control.evidences(...)                                │ Pagination                                             │  EvidenceConnection! 
    task.evidences(...)                                   │ Pagination                                             │  EvidenceConnection! 
    evidence.controls(...)                                │ Pagination                                             │  ControlConnection! 
    evidence.tasks(...)                                   │ Pagination                                             │  TaskConnection! 
    evidence.files(...)                                   │ Pagination                                             │  EvidenceFileConnection! 
    evidence.evidenceRequests(...)                        │ Pagination                                             │  EvidenceRequestConnection! 
                                                                                                                                                                           
  ### GraphQL Mutations                                                                                                                                                    
                                                                                                                                                                           
   Mutation                                               │ Input Type                                             │ Returns
  ────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────
    createEvidence                                        │  CreateEvidenceInput                                   │  CreateEvidencePayload 
    updateEvidence                                        │  UpdateEvidenceInput                                   │  UpdateEvidencePayload 
    deleteEvidence                                        │  DeleteEvidenceInput                                   │  DeleteEvidencePayload 
    linkControlToEvidence                                 │  LinkControlToEvidenceInput                            │  LinkControlToEvidencePayload 
    unlinkControlFromEvidence                             │  UnlinkControlFromEvidenceInput                        │  UnlinkControlFromEvidencePayload 
    linkTaskToEvidence                                    │  LinkTaskToEvidenceInput                               │  LinkTaskToEvidencePayload 
    unlinkTaskFromEvidence                                │  UnlinkTaskFromEvidenceInput                           │  UnlinkTaskFromEvidencePayload 
    deleteEvidenceFile                                    │  DeleteEvidenceFileInput                               │  DeleteEvidenceFilePayload 
    createEvidenceRequest                                 │  CreateEvidenceRequestInput                            │  CreateEvidenceRequestPayload 
    updateEvidenceRequest                                 │  UpdateEvidenceRequestInput                            │  UpdateEvidenceRequestPayload 
    deleteEvidenceRequest                                 │  DeleteEvidenceRequestInput                            │  DeleteEvidenceRequestPayload 
                                                                                                                                                                           
  ### HTTP Endpoints                                                                                                                                                       
                                                                                                                                                                           
   Method                                                 │ Path                                                   │ Purpose
  ────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────┼───────────────────────────────────────────────────────
    POST                                                  │  /upload/evidence/{evidenceId}/file                    │ Upload file to evidence
    GET                                                   │  /download/evidence-file/{evidenceFileId}              │ Download evidence file
                                                                                                                                                                           
  ### MCP Tools                                                                                                                                                            
                                                                                                                                                                           
   Tool                                                                               │ Description
  ────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────
    list_evidences                                                                    │ List all evidences in organization
    get_evidence                                                                      │ Get evidence by ID
    create_evidence                                                                   │ Create new evidence
    update_evidence                                                                   │ Update evidence
    delete_evidence                                                                   │ Delete evidence
    link_evidence_to_control                                                          │ Link evidence to control
    unlink_evidence_from_control                                                      │ Unlink evidence from control
                                                                                                                                                                           
  ### CLI Commands                                                                                                                                                         
                                                                                                                                                                           
   Command                                                                            │ Purpose
  ────────────────────────────────────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────────────
    probo evidence list                                                               │ List evidences
    probo evidence get                                                                │ Get evidence details
    probo evidence create                                                             │ Create evidence
    probo evidence update                                                             │ Update evidence
    probo evidence delete                                                             │ Delete evidence
                                                                                                                                                                           
  All three research subagents have reported back with comprehensive findings. Let me now verify a few additional details and then write the documentation.                

● Search(Evidence expiry search)
● Search(Evidence expiry patterns)``
