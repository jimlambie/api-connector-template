const config = require('../config')
const debug = require('debug')('api:mysql')
const EventEmitter = require('events').EventEmitter
const path = require('path')
const util = require('util')
const uuid = require('uuid')

// require MySQL module
const mysql = require('mysql2')

const STATE_DISCONNECTED = 0
const STATE_CONNECTED = 1
const STATE_CONNECTING = 2

/**
 * @typedef ConnectionOptions
 * @type {Object}
 * @property {string} database - the name of the database file to use
 * @property {Object} collection - the name of the collection to use
 */

/**
 * @typedef QueryOptions
 * @type {Object}
 * @property {number} limit - the number of records to return
 * @property {number} skip - an offset, the number of records to skip
 * @property {Object} sort - an object specifying properties to sort by. `{"title": 1}` will sort the results by the `title` property in ascending order. To reverse the sort, use `-1`: `{"title": -1}`
 * @property {Object} fields - an object specifying which properties to return. `{"title": 1}` will return results with all properties removed except for `_id` and `title`
 */

/**
 * Handles the interaction with <Database>
 * @constructor DataStore
 * @classdesc DataStore adapter for using <Database> with DADI API
 * @implements EventEmitter
 */
const DataStore = function DataStore (options) {
  this.config = options || config.get()
  this.readyState = STATE_DISCONNECTED
}

util.inherits(DataStore, EventEmitter)

/**
 * Connect to the database
 *
 * @param {ConnectionOptions} options
 */
DataStore.prototype.connect = function (options) {
  debug('connect %o', options)

  return new Promise((resolve, reject) => {
    // read configuration options from config/mysql.<environment>.json
    const dbConfig = config.get('database')

    // connect!
    this.database = mysql.createConnection(dbConfig)

    // everything is ok, emit 'DB_CONNECTED' event
    this.readyState = STATE_CONNECTED
    this.emit('DB_CONNECTED', this.database)

    // problem connecting? emit 'DB_ERROR' event
    // this.emit('DB_ERROR', err)
    // return reject(err)

    return resolve()
  })
}

/**
 * Create a new MySQL table if the specified one doesn't exist
 *
 * Queries the MySQL information_schema database, returning a count of
 * tables that exist for the specified database + table_name parameters
 *
 * If the table doesn't exist, build a CREATE TABLE statement to execute against the database
 *
 * @param {String} name - the name of the table to check or create
 * @param {Object} schema - the API collection schema fields
 * @returns {Promise.<undefined, Error>} A promise that returns an Array of results,
 *     or an Error if the operation fails
 */
DataStore.prototype.createTable = function (table, schema) {
  return new Promise((resolve, reject) => {
    // does the table exist?
    let tableQuery = `SELECT COUNT(*)
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = '${config.get('database.database')}' AND TABLE_NAME = '${table}'`

    return this.database.query(tableQuery, (err, result) => {
      if (result[0]['COUNT(*)'] === 0) {
        let createTableQuery = 'CREATE TABLE ' + table + ' ('

        // add an _id column as a default
        createTableQuery += '_id VARCHAR(100),'

        // add columns based on the collection schema
        Object.keys(schema).forEach(key => {
          createTableQuery += `${key} ${schema[key].type === 'String' ? 'VARCHAR(255)' : 'INT'},`
        })

        createTableQuery += 'PRIMARY KEY(_id))'

        this.database.query(createTableQuery, (err, result) => {
          return resolve()
        })
      }

      // the table already exists, return
      return resolve()
    })
  })
}

/**
 * Query the database
 *
 * @param {Object} query - the query to perform
 * @param {string} collection - the name of the collection to query
 * @param {QueryOptions} options - a set of query options, such as offset, limit, sort, fields
 * @param {Object} schema - the JSON schema for the collection
 * @returns {Promise.<Array, Error>} A promise that returns an Array of results,
 *     or an Error if the operation fails
 */
DataStore.prototype.find = function ({ query, collection, options = {}, schema, settings }) {
  if (this.readyState !== STATE_CONNECTED) {
    return Promise.reject(new Error('DB_DISCONNECTED'))
  }

  options = options || {}

  debug('find in %s where %o %o', collection, query, options)

  return new Promise((resolve, reject) => {
    const findQuery = `SELECT * FROM ${collection} WHERE _id = ?`

    // query the database
    return this.database.query(findQuery, query, (err, results, fields) => {
      return resolve(results)
    })
  })
}

/**
 * Insert documents into the database
 *
 * @param {Object|Array} data - a single document or an Array of documents to insert
 * @param {string} collection - the name of the collection to insert into
 * @param {object} options - options to modify the query
 * @param {Object} schema - the JSON schema for the collection
 * @returns {Promise.<Array, Error>} A promise that returns an Array of inserted documents,
 *     or an Error if the operation fails
 */
DataStore.prototype.insert = function ({data, collection, options = {}, schema, settings = {}}) {
  if (this.readyState !== STATE_CONNECTED) {
    return Promise.reject(new Error('DB_DISCONNECTED'))
  }

  debug('insert into %s %o', collection, data)

  // make an Array of documents if an Object has been provided
  if (!Array.isArray(data)) {
    data = [data]
  }

  // add an _id if the document doesn't come with one
  data.forEach((document) => {
    document._id = document._id || uuid.v4()
  })

  return new Promise((resolve, reject) => {
    const insertQuery = `INSERT INTO ${collection} SET ?`
    const findQuery = `SELECT * FROM ${collection} WHERE _id = ?`

    // first check the table exists
    return this.createTable(collection, schema).then(() => {
      return this.database.query(insertQuery, data[0], (err, results, fields) => {
        if (err) {
          return reject(err)
        }

        // query the database for the new document(s)
        return this.database.query(findQuery, data[0]._id, (err, results, fields) => {
          return resolve(results)
        })
      })
    })
  })
}

/**
 * Update documents in the database
 *
 * @param {object} query - the query that selects documents for update
 * @param {string} collection - the name of the collection to update documents in
 * @param {object} update - the update for the documents matching the query
 * @param {object} options - options to modify the query
 * @param {object} schema - the JSON schema for the collection
 * @returns {Promise.<Array, Error>} A promise that returns an Array of updated documents,
 *     or an Error if the operation fails
 */
DataStore.prototype.update = function ({query, collection, update, options = {}, schema}) {
  if (this.readyState !== STATE_CONNECTED) {
    return Promise.reject(new Error('DB_DISCONNECTED'))
  }

  debug('update %s where %o with %o', collection, query, update)

  return new Promise((resolve, reject) => {
    let results = []
    return resolve(results)
  })
}

/**
 * Remove documents from the database
 *
 * @param {Object} query - the query that selects documents for deletion
 * @param {string} collection - the name of the collection to delete from
 * @param {Object} schema - the JSON schema for the collection
 * @returns {Promise.<Array, Error>} A promise that returns an Object with one property `deletedCount`,
 *     or an Error if the operation fails
 */
DataStore.prototype.delete = function ({query, collection, schema}) {
  if (this.readyState !== STATE_CONNECTED) {
    return Promise.reject(new Error('DB_DISCONNECTED'))
  }

  debug('delete from %s where %o', collection, query)

  return new Promise((resolve, reject) => {
    return resolve({ deletedCount: 1 })
  })
}

/**
 * Get metadata about the specfied collection, including number of records
 *
 * @param {Object} options - the query options passed from API, such as page, limit, skip
 * @returns {Object} an object containing the metadata about the collection
 */
DataStore.prototype.stats = function (collection, options) {
  if (this.readyState !== STATE_CONNECTED) {
    return Promise.reject(new Error('DB_DISCONNECTED'))
  }

  return new Promise((resolve, reject) => {
    let result = {
      count: 100
    }

    return resolve(result)
  })
}

/**
 *
 */
DataStore.prototype.index = function (collection, indexes) {
  return new Promise((resolve, reject) => {
    // Create an index on the specified field(s)
    let results = []

    indexes.forEach((index, idx) => {
      results.push({
        collection: 'collection',
        index: 'indexName'
      })

      if (idx === indexes.length - 1) {
        return resolve(results)
      }
    })
  })
}

/**
 * Get an array of indexes
 *
 * @param {string} collectionName - the name of the collection to get indexes for
 * @returns {Array} - an array of index objects, each with a name property
 */
DataStore.prototype.getIndexes = function (collectionName) {
  if (this.readyState !== STATE_CONNECTED) {
    return Promise.reject(new Error('DB_DISCONNECTED'))
  }

  return new Promise((resolve, reject) => {
    let indexes = [{
      name: 'index_1'
    }]

    return resolve(indexes)
  })
}

DataStore.prototype.dropDatabase = function (collectionName) {
  if (this.readyState !== STATE_CONNECTED) {
    return Promise.reject(new Error('DB_DISCONNECTED'))
  }

  debug('dropDatabase %s', collectionName || '')

  return new Promise((resolve, reject) => {
    const deleteQuery = `DELETE FROM ${collectionName}`

    // delete all
    return this.database.query(deleteQuery, (err, results, fields) => {
      return resolve()
    })
  })
}

module.exports = DataStore
