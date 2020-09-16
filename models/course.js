'use strict';
const {
    Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
    class Course extends Model {
        /**
         * Helper method for defining associations.
         * This method is not a part of Sequelize lifecycle.
         * The `models/index` file will call this method automatically.
         */
        static associate(models) {
            // define association here
        }
    };
    Course.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        title: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        estimatedTime: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        materialsNeeded: {
            type: DataTypes.STRING,
            allowNull: true,
        },

    }, {
        sequelize,
        modelName: 'Course',
    });

    Course.associate = (models) => {
        // TODO Add associations.
        Course.belongsTo(models.User, {
            as: 'creator', // alias
            foreignKey: {
                fieldName: 'userId',
                allowNull: false,
            },
        });
    };
    return Course;
};