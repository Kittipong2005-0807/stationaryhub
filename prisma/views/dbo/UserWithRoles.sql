SELECT
  CAST(ADLoginName AS VARCHAR(50)) AS AdLoginName,
  CAST(EmpCode AS VARCHAR(50)) AS EmpCode,
  CAST(CurrentEmail AS VARCHAR(100)) AS CurrentEmail,
  CAST(FullNameEng AS VARCHAR(100)) AS FullNameEng,
  CAST(FullNameThai AS VARCHAR(100)) AS FullNameThai,
  CAST(PostNameEng AS VARCHAR(100)) AS PostNameEng,
  CAST(costcentereng AS VARCHAR(100)) AS CostCenterEng,
  CAST(OrgTDesc3 AS VARCHAR(100)) AS OrgTDesc3,
  CAST(OrgCode3 AS VARCHAR(100)) AS OrgCode3,
  supereng,
  superempcode,
  CAST(OrgCode4 AS VARCHAR(100)) AS OrgCode4,
  CAST(OrgTDesc4 AS VARCHAR(100)) AS OrgTDesc4,
  costcentercode
FROM
  THRYGSD002.ICTPortal_PRD.dbo.vwHR_SC_Employee AS u;