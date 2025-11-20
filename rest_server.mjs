import * as path from 'node:path';
import * as url from 'node:url';

import { default as express } from 'express';
import { default as sqlite3 } from 'sqlite3';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const db_filename = path.join(__dirname, 'db', 'stpaul_crime.sqlite3');

const port = 8000;

let app = express();
app.use(express.json());

/********************************************************************
 ***   DATABASE FUNCTIONS                                         *** 
 ********************************************************************/
// Open SQLite3 database (in read-write mode)
let db = new sqlite3.Database(db_filename, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
        console.log('Error opening ' + path.basename(db_filename));
    }
    else {
        console.log('Now connected to ' + path.basename(db_filename));
    }
});

// Create Promise for SQLite3 database SELECT query 
function dbSelect(query, params) {
    return new Promise((resolve, reject) => {
        db.all(query, params, (err, rows) => {
            if (err) {
                reject(err);
            }
            else {
                resolve(rows);
            }
        });
    });
}

// Create Promise for SQLite3 database INSERT or DELETE query
function dbRun(query, params) {
    return new Promise((resolve, reject) => {
        db.run(query, params, (err) => {
            if (err) {
                reject(err);
            }
            else {
                resolve();
            }
        });
    });
}

/********************************************************************
 ***   REST REQUEST HANDLERS                                      *** 
 ********************************************************************/
// GET request handler for crime codes
app.get('/codes', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)

    let sql = '';
    let placeholders = '';
    let codes;

    // if 'code' exists as a query parameter
    if ('code' in req.query) { 
        codes = req.query.code.split(',');
        for (let i = 0; i < codes.length; i++) {
            codes[i] = parseInt(codes[i]);
            // if it's the last item of the list
            if (i === codes.length - 1) {
                placeholders += '?';
            }
            // if it's NOT the last item of the list
            else {
                placeholders += '?, ';
            }
        }

        sql = 'SELECT code, incident_type AS type FROM Codes WHERE code IN (' + placeholders + ') ORDER BY code';
    }
    // if 'code' does not exist as a query parameter
    else {
        sql = 'SELECT code, incident_type AS type FROM Codes ORDER BY code';
    }

    dbSelect(sql, codes)
    .then((rows) => {
        res.status(200).type('json').send(JSON.stringify(rows, null, 4));
    })
    .catch((err) => {
        console.log(err);
        res.status(500).type('txt').send('Error retrieving codes');
    });

});

// GET request handler for neighborhoods
app.get('/neighborhoods', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)

    let sql = '';
    let placeholders = '';
    let ids;

    // if 'id' exists as a query parameter
    if ('id' in req.query) { 
        ids = req.query.id.split(',');
        for (let i = 0; i < ids.length; i++) {
            ids[i] = parseInt(ids[i]);
            // if it's the last item of the list
            if (i === ids.length - 1) {
                placeholders += '?';
            }
            // if it's NOT the last item of the list
            else {
                placeholders += '?, ';
            }
        }

        sql = `SELECT neighborhood_number AS id, neighborhood_name AS name FROM Neighborhoods WHERE neighborhood_number IN (${placeholders}) ORDER BY neighborhood_number`;
    }
    // if 'id' does not exist as a query parameter
    else {
        sql = 'SELECT neighborhood_number AS id, neighborhood_name AS name FROM Neighborhoods ORDER BY neighborhood_number';
    }

    dbSelect(sql, ids)
    .then((rows) => {
        res.status(200).type('json').send(JSON.stringify(rows, null, 4));
    })
    .catch((err) => {
        console.log(err);
        res.status(500).type('txt').send('Error retrieving neighborhoods');
    });
    
});

// GET request handler for crime incidents
app.get('/incidents', (req, res) => {
    console.log(req.query); // query object (key-value pairs after the ? in the url)
    
    let start_dates;
    let end_dates;
    let codes;
    let grids;
    let neighborhoods;
    let limit = 1000;
    let placeholders = '';
    let queryParamCount = 0; // 'limit' doesn't count
    let params = [];

    let sql = 'SELECT case_number, date(date_time) AS date, time(date_time) AS time, code, incident, police_grid, neighborhood_number, block FROM Incidents';

    // if 'start_date' exists as a query parameter
    if ('start_date' in req.query) { 
        queryParamCount++;
        start_dates = req.query.start_date.split(',');
        for (let i = 0; i < start_dates.length; i++) {
            start_dates[i] = parseInt(start_dates[i]);
            // if it's the last item of the list
            if (i === start_dates.length - 1) {
                placeholders += '?';
            }
            // if it's NOT the last item of the list
            else {
                placeholders += '?, ';
            }
        }

        if (queryParamCount === 1) {
            sql += ' WHERE start_date IN (' + placeholders + ')';
        }
        else {
            sql += ' AND start_date IN (' + placeholders + ')';
        }

        placeholders = '';
        params = params.concat(start_dates);
    }


    // if 'end_date' exists as a query parameter
    if ('end_date' in req.query) { 
        queryParamCount++;
        end_dates = req.query.end_date.split(',');
        for (let i = 0; i < end_dates.length; i++) {
            end_dates[i] = parseInt(end_dates[i]);
            // if it's the last item of the list
            if (i === end_dates.length - 1) {
                placeholders += '?';
            }
            // if it's NOT the last item of the list
            else {
                placeholders += '?, ';
            }
        }

        if (queryParamCount === 1) {
            sql += ' WHERE end_date IN (' + placeholders + ')';
        }
        else {
            sql += ' AND end_date IN (' + placeholders + ')';
        }

        placeholders = '';
        params = params.concat(end_dates);
    }


    // if 'code' exists as a query parameter
    if ('code' in req.query) { 
        queryParamCount++;
        codes = req.query.code.split(',');
        for (let i = 0; i < codes.length; i++) {
            codes[i] = parseInt(codes[i]);
            // if it's the last item of the list
            if (i === codes.length - 1) {
                placeholders += '?';
            }
            // if it's NOT the last item of the list
            else {
                placeholders += '?, ';
            }
        }

        if (queryParamCount === 1) {
            sql += ' WHERE code IN (' + placeholders + ')';
        }
        else {
            sql += ' AND code IN (' + placeholders + ')';
        }

        placeholders = '';
        params = params.concat(codes);
    }

    // if 'grid' exists as a query parameter
    if ('grid' in req.query) { 
        queryParamCount++;
        grids = req.query.grid.split(',');
        for (let i = 0; i < grids.length; i++) {
            grids[i] = parseInt(grids[i]);
            // if it's the last item of the list
            if (i === grids.length - 1) {
                placeholders += '?';
            }
            // if it's NOT the last item of the list
            else {
                placeholders += '?, ';
            }
        }

        if (queryParamCount === 1) {
            sql += ' WHERE police_grid IN (' + placeholders + ')';
        }
        else {
            sql += ' AND police_grid IN (' + placeholders + ')';
        }

        placeholders = '';
        params = params.concat(grids);
    }

    // if 'neighborhood' exists as a query parameter 
    if ('neighborhood' in req.query) { 
        queryParamCount++;
        neighborhoods = req.query.neighborhood.split(',');
        for (let i = 0; i < neighborhoods.length; i++) {
            neighborhoods[i] = parseInt(neighborhoods[i]);
            // if it's the last item of the list
            if (i === neighborhoods.length - 1) {
                placeholders += '?';
            }
            // if it's NOT the last item of the list
            else {
                placeholders += '?, ';
            }
        }

        if (queryParamCount === 1) {
            sql += ' WHERE neighborhood_number IN (' + placeholders + ')';
        }
        else {
            sql += ' AND neighborhood_number IN (' + placeholders + ')';
        }

        placeholders = '';
        params = params.concat(neighborhoods);
    }

    // if 'limit' exists as a query parameter
    if ('limit' in req.query) {
        limit = req.query.limit;
    }
   
    sql += ' ORDER BY date_time DESC LIMIT ' + limit;

    //let sql = 'SELECT * FROM Incidents LIMIT 1000';
    // let sql = 'SELECT case_number, date(date_time) AS date, time(date_time) AS time, code, incident, police_grid, neighborhood_number, block FROM Incidents ORDER BY date_time DESC LIMIT 1000';

    dbSelect(sql, params)
    .then((rows) => {

        res.status(200).type('json').send(JSON.stringify(rows, null, 4));
    })
    .catch((err) => {
        console.log(err);
        res.status(500).type('txt').send('Error retrieving incidents');
    });

});

// PUT request handler for new crime incident
app.put('/new-incident', (req, res) => {
    console.log(req.body); // uploaded data

    let case_number_already_exists = false;

    let sqlSelect = 'SELECT * FROM Incidents WHERE case_number = ?';

    dbSelect(sqlSelect, [req.body.case_number])
    .then((rows) => {
        if (rows.length > 0) {
            case_number_already_exists = true;
        }

        if (!case_number_already_exists) {
            let sql = 'INSERT INTO Incidents (case_number, date_time, code, incident, police_grid, neighborhood_number, block) VALUES (?, ?, ?, ?, ?, ?, ?)';
        
            let date_time = req.body.date + 'T' + req.body.time;
            let insertParams = [req.body.case_number, date_time, req.body.code, req.body.incident, req.body.police_grid, req.body.neighborhood_number, req.body.block];

            dbRun(sql, insertParams)
            .then(() => {
                res.status(200).type('txt').send("Incident added successfully");
            }) 
            .catch((err) => {
                console.log(err);
                res.status(500).type('txt').send("Error: could not insert incident");
            });
        }
        else {
            res.status(500).type('txt').send("Error: could not insert incident because case number already exists in the database");
        }
    })
    .catch((err) => {
        console.log(err);
    })

});

// DELETE request handler for new crime incident
app.delete('/remove-incident', (req, res) => {
    console.log(req.body); // uploaded data

    let case_number_already_exists = false;

    let sqlSelect = 'SELECT * FROM Incidents WHERE case_number = ?';

    dbSelect(sqlSelect, [req.body.case_number])
    .then((rows) => {
        if (rows.length > 0) {
            case_number_already_exists = true;
        }

        if (case_number_already_exists) {
            let sql = 'DELETE FROM Incidents WHERE case_number = ?';

            dbRun(sql, req.body.case_number)
            .then(() => {
                res.status(200).type('txt').send("Incident deleted successfully");
            }) 
            .catch((err) => {
                console.log(err);
                res.status(500).type('txt').send("Error: could not delete incident");
            });
        }
        else {
            res.status(500).type('txt').send("Error: could not delete incident because case number does not exist in the database");
        }
    })
    .catch((err) => {
        console.log(err);
    })

});

/********************************************************************
 ***   START SERVER                                               *** 
 ********************************************************************/
// Start server - listen for client connections
app.listen(port, () => {
    console.log('Now listening on port ' + port);
});
