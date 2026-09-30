const { Job } = require("./job");
const { JobLog } = require("./JobLog");

Job.hasMany(JobLog,{
  foreignKey: "jobId"
});

JobLog.belongsTo(Job, {
  foreignKey: "jobId"
});

module.exports = {
  Job,
  JobLog
};