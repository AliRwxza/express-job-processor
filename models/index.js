const Job = require("./job");
const JobLog = require("./jobLog");

Job.hasMany(JobLog,
  { foreignKey: "jobId" }
);

JobLog.belongsTo(Job, 
  { foreignKey: "jobId" }
);

module.exports = {
  Job,
  JobLog
};