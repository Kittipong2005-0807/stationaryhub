SELECT
  CAST(u.ADLoginName AS VARCHAR(50)) AS AdLoginName,
  CAST(u.EmpCode AS VARCHAR(50)) AS EmpCode,
  CAST(u.CurrentEmail AS VARCHAR(100)) AS CurrentEmail,
  CAST(u.FullNameEng AS VARCHAR(100)) AS FullNameEng,
  CAST(u.FullNameThai AS VARCHAR(100)) AS FullNameThai,
  CAST(u.PostNameEng AS VARCHAR(100)) AS PostNameEng,
  CAST(u.costcentereng AS VARCHAR(100)) AS CostCenterEng
FROM
  thrygsd002.ICTPortal_PRD.dbo.vwHR_SC_Employee AS u;