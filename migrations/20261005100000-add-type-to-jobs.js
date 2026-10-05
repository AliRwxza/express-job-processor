'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('jobs', 'type', {
      type: Sequelize.STRING(100),
      allowNull: false,
      defaultValue: 'processBatchData'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('jobs', 'type');
  }
};
