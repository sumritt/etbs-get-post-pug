var express = require('express');
var database = require('./database');
var router = express.Router();

/* GET etbs-users listing. */
router.get('/', function(req, res, next) {

  var conn = database.getConnection();

  if (conn) {
    var sql = 
      `SELECT rolename, profileid, is_active 
      FROM roles`;

    conn.query(sql, function (err, result) {
      res.render('v1/etbsRoles', 
        {
          roles: result
        }
      );
      conn.end();
    });
  } else {
    res.status(500).send('Can not connect to database');
  }
});

router.get('/add', function(req, res, next) {
  var conn = database.getConnection();

  if (conn) {

    var sql = `SELECT DISTINCT p.permission, p.profileid, p.perm_type, r.rolename
    FROM permissions p
    LEFT JOIN roles r ON p.profileid = r.profileid`;

    conn.query(sql, function (err, permsResult) {
      res.render('v1/etbsRolesForm', {
        action: '/etbs-roles/insert',
        permissions : permsResult
      });
      
      conn.end();
    });
  
  } else {
    res.status(500).send('Can not connect to database');
  }

});

router.post('/insert', function(req, res, next) {
  var rolename = req.body.rolename;
  var profileid = req.body.profileid;
  var is_active = req.body.is_active;

  var permissionsObj = req.body.permissions;
  var permissions;

  if (!permissionsObj) {
    permissions = [];
  } else if (typeof permissionsObj === 'string') {
    permissions = [JSON.parse(permissionsObj)];
  } else {
    permissions = permissionsObj.map(json => JSON.parse(json));
  }
  
  var conn = database.getConnection();
  
  if (conn) {
    
    var sql = 'INSERT INTO roles SET ?';
    var role = {
      rolename: rolename,
      profileid: profileid,
      is_active: is_active
    };

    conn.query(sql, role, function (err, result) {

      permissions.forEach( function (element) {
        var sql = 'UPDATE permissions SET ? WHERE permission = ? AND profileid = ? AND perm_type = ?';
          var setditions = [
            {
              profileid: profileid
            },
            element.permission,
            element.profileid,
            element.perm_type
          ];

          conn.query(sql, setditions, function(err, result) {

          });
      });

      setTimeout(() => {
        conn.end();
      }, 1000);

      if (!err)
        res.redirect('/etbs-roles');
      else 
        res.render('v1/etbsRolesForm', {
          action: '/etbs-roles/insert',
          error: err
        });
    });
  } else {
    res.status(500).send('Can not connect to database');
  }
});

router.get('/edit/:rolename/:profileid', function(req, res, next) {
  var rolename = req.params.rolename;
  var profileid = req.params.profileid;

  var error = req.query.error;

  var is_active = '';

  var cnt = '';
  var permsCnt = '';

  var conn = database.getConnection();

  if (conn) {
    var sql = 'SELECT is_active FROM roles WHERE rolename = ? AND profileid = ? LIMIT 1 OFFSET 0';
    var conditions = [rolename, profileid];

    conn.query(sql, conditions, function (err, fieldResult) {
      is_active = fieldResult.length ? fieldResult[0].is_active : '';

      var sql = 'SELECT COUNT(1) AS cnt FROM users WHERE rolename = ?';
      var conditions = [rolename];
  
      conn.query(sql, conditions, function (err, result) {
        cnt = result.length ? result[0].cnt : 0;
  
        if (result) {
          var sql = 'SELECT COUNT(1) AS cnt FROM permissions WHERE profileid = ?';
          var conditions = [profileid];
  
          conn.query(sql, conditions, function (err, permsCntResult) {
            permsCnt = permsCntResult.length ? permsCntResult[0].cnt : 0;
  
            if (permsCntResult) {
              var sql = 
                `SELECT DISTINCT p.permission, p.profileid, p.perm_type, r.rolename
                FROM permissions p
                LEFT JOIN roles r ON p.profileid = r.profileid`;

              conn.query(sql, function (err, permsResult) {
                var originPermissions = permsResult.filter(perm => perm.profileid == profileid);
                res.render('v1/etbsRolesForm', {
                  action      : '/etbs-roles/update',
                  rolename    : rolename,
                  profileid   : profileid,
                  is_active   : is_active,
                  cnt         : cnt,
                  permsCnt    : permsCnt,
                  permissions : permsResult,
                  originPermissions : originPermissions,
                  error       : error
                });
          
                conn.end();
              });

            }
          });
        }
      });
    });
  } else {
    res.status(500).send('Can not connect to database');
  }
});

router.post('/update', function(req, res, next) {
  var originRolename = req.body.originRolename;
  var originProfileid = req.body.originProfileid;
  var rolename = req.body.rolename;
  var profileid = req.body.profileid;
  var is_active = req.body.is_active;

  var permissionsObj = req.body.permissions;
  var permissions;

  if (!permissionsObj) {
    permissions = [];
  } else if (typeof permissionsObj === 'string') {
    permissions = [JSON.parse(permissionsObj)];
  } else {
    permissions = permissionsObj.map(json => JSON.parse(json));
  }
  
  var originPermissionsObj = req.body.originPermissions;
  var originPermissions;

  if (!originPermissionsObj) {
    originPermissions = [];
  } else if (typeof originPermissionsObj === 'string') {
    originPermissions = [JSON.parse(originPermissionsObj)];
  } else {
    originPermissions = originPermissionsObj.map(json => JSON.parse(json));
  }

  var conn = database.getConnection();

  if (conn) {

    var sql = 'UPDATE roles SET ? WHERE rolename = ? AND profileid = ?';
    var setditions = [
      {
        rolename: rolename,
        profileid: profileid,
        is_active: is_active
      },
      originRolename,
      originProfileid
    ];

    conn.query(sql, setditions, function (err, result) {
      var permsTemp;
      originPermissions.forEach(function(originElement) {
        permsTemp = permissions.find(function(element) {
          return ( originElement.permission == element.permission &&
            originElement.profileid == element.profileid &&
            originElement.perm_type == element.perm_type
          );
        });

        if (!permsTemp) {
          var sql = 'UPDATE permissions SET ? WHERE permission = ? AND profileid = ? AND perm_type = ?';
          var setditions = [
            {
              profileid: 0
            },
            originElement.permission,
            originElement.profileid,
            originElement.perm_type
          ];

          conn.query(sql, setditions, function(err, result) {

          });
        }
      });

      permissions.forEach(function(element) {
        var sql = 'UPDATE permissions SET ? WHERE permission = ? AND profileid = ? AND perm_type = ?';
        var setditions = [
          {
            permission: element.permission,
            profileid: profileid,
            perm_type: element.perm_type
          },
          element.permission,
          element.profileid,
          element.perm_type
        ];

        conn.query(sql, setditions, function(err, result) {

        });

      });
      
      setTimeout(() => {
        conn.end();
      }, 1000);
      
      if (!err)
        res.redirect('/etbs-roles');
      else
        res.redirect('/etbs-roles/edit/' + originRolename + '/' + originProfileid + '?error=1');
    });
  } else {
    res.status(500).send('Can not connect to database');
  }
});

router.get('/remove/:rolename/:profileid', function(req, res, next) {
  var rolename = req.params.rolename;
  var profileid = req.params.profileid;

  var is_active = '';

  var cnt = '';
  var permsCnt = '';

  var conn = database.getConnection();

  if (conn) {
    var sql = 'SELECT is_active FROM roles WHERE rolename = ? AND profileid = ? LIMIT 1 OFFSET 0';
    var conditions = [rolename, profileid];

    conn.query(sql, conditions, function (err, fieldResult) {
      is_active = fieldResult.length ? fieldResult[0].is_active : '';

      var sql = 'SELECT COUNT(1) AS cnt FROM users WHERE rolename = ?';
      var conditions = [rolename];
  
      conn.query(sql, conditions, function (err, result) {
        cnt = result.length ? result[0].cnt : 0;
  
        if (result) {
          var sql = 'SELECT COUNT(1) AS cnt FROM permissions WHERE profileid = ?';
          var conditions = [profileid];
  
          conn.query(sql, conditions, function (err, permsResult) {
            permsCnt = permsResult.length ? permsResult[0].cnt : 0;
  
            res.render('v1/etbsRolesForm', {
              action: '/etbs-roles/delete',
              rolename: rolename,
              profileid: profileid,
              is_active: is_active,
              cnt: cnt,
              permsCnt: permsCnt
            });
      
            conn.end();
          });
        }
      });
    });
  } else {
    res.status(500).send('Can not connect to database');
  }
});

router.post('/delete', function(req, res, next) {
  var originRolename = req.body.originRolename;
  var originProfileid = req.body.originProfileid;

  var conn = database.getConnection();

  if (conn) {

    var sql = 'DELETE FROM roles WHERE rolename = ? AND profileid = ?';
    var conditions = [originRolename, originProfileid];

    conn.query(sql, conditions, function (err, result) {
      conn.end();
      res.redirect('/etbs-roles');
    });
  } else {
    res.status(500).send('Can not connect to database');
  }
});

router.get('/users/:rolename/:profileid', function(req, res, next) {
  var rolename = req.params.rolename;
  var profileid = req.params.profileid;

  var roleUsers = {};

  var conn = database.getConnection();

  if (conn) {
    var sql = 'SELECT username, rolename FROM users WHERE rolename = ?';
    var conditions = [rolename];

    conn.query(sql, conditions, function (err, result) {
      
      if (result) {
        roleUsers = result;
        
        var sql = 'SELECT username, rolename FROM users WHERE rolename != ?';
        var conditions = [rolename];
        
        conn.query(sql, conditions, function (err, unRoleResult) {
          res.render('v1/etbsRoleUsers', 
            {
              users: roleUsers, 
              unRoleUsers: unRoleResult, 
              rolename: rolename,
              profileid: profileid
            }
          );
          conn.end();
        });
      }
    });
  } else {
    res.status(500).send('Can not connect to database');
  }
});

router.post('/users/insert', function(req, res, next) {
  var username = req.body.username;
  var rolename = req.body.rolename;
  var profileid = req.body.profileid;

  var conn = database.getConnection();

  if (conn) {

    var sql = 'UPDATE users SET ? WHERE username = ?';
    var setditions = [
      { rolename: rolename },
      username
    ];

    conn.query(sql, setditions, function (err, result) {
      conn.end();
      res.redirect('/etbs-roles/users/' + rolename + '/' + profileid);
    });
  } else {
    res.status(500).send('Can not connect to database');
  }
});

router.post('/users/delete', function(req, res, next) {
  var username = req.body.username;
  var rolename = req.body.rolename;
  var profileid = req.body.profileid;

  var conn = database.getConnection();

  if (conn) {

    var sql = 'UPDATE users SET ? WHERE username = ?';
    var setditions = [
      { rolename: '' },
      username
    ];

    conn.query(sql, setditions, function (err, result) {
      conn.end();
      res.redirect('/etbs-roles/users/' + rolename + '/' + profileid);
    });
  } else {
    res.status(500).send('Can not connect to database');
  }
});

router.get('/permissions/:rolename/:profileid', function(req, res, next) {
  var rolename = req.params.rolename;
  var profileid = req.params.profileid;

  var permissions = {};

  var conn = database.getConnection();

  if (conn) {
    var sql = 
      `SELECT permission, p.profileid, perm_type, r.rolename 
      FROM permissions p
        LEFT JOIN roles r ON p.profileid = r.profileid
      WHERE p.profileid = ?`;
    var conditions = [profileid];

    conn.query(sql, conditions, function (err, result) {
      
      if (result) {
        permissions = result.length ? result : [];
        
        var sql = 
          `SELECT permission, p.profileid, perm_type, r.rolename 
          FROM permissions p
            LEFT JOIN roles r ON p.profileid = r.profileid
          WHERE p.profileid != ?`;
        var conditions = [profileid];
        
        conn.query(sql, conditions, function (err, unPermissionsResult) {
          res.render('v1/etbsRolePermissions', 
            {
              permissions: permissions, 
              unPermissions: unPermissionsResult, 
              rolename: rolename,
              profileid: profileid
            }
          );
          conn.end();
        });
      }
    });
  } else {
    res.status(500).send('Can not connect to database');
  }
});

router.post('/permissions/insert', function(req, res, next) {
  var rolename = req.body.rolename;

  var permission = req.body.permission;
  var profileid = req.body.profileid;
  var originProfileid = req.body.originProfileid;
  var perm_type = req.body.perm_type;

  var conn = database.getConnection();

  if (conn) {
    var sql = `UPDATE permissions SET ? 
    WHERE permission = ? AND profileid = ? AND perm_type = ?` ;
    var setditions = [
      {
        profileid: originProfileid
      },
      permission,
      profileid,
      perm_type
    ];

    conn.query(sql, setditions, function (err, result) {
      conn.end();
      res.redirect('/etbs-roles/permissions/' + rolename + '/' + originProfileid);
    });
  } else {
    res.status(500).send('Can not connect to database');
  }
});

router.post('/permissions/delete', function(req, res, next) {
  var rolename = req.body.rolename;

  var permission = req.body.permission;
  var profileid = req.body.profileid;
  var perm_type = req.body.perm_type;

  var conn = database.getConnection();

  if (conn) {

    var sql = `UPDATE permissions SET ? 
    WHERE permission = ? AND profileid = ? AND perm_type = ?` ;
    var setditions = [
      {
        profileid: ''
      },
      permission,
      profileid,
      perm_type
    ];

    conn.query(sql, setditions, function (err, result) {
      conn.end();
      res.redirect('/etbs-roles/permissions/' + rolename + '/' + profileid);
    });
  } else {
    res.status(500).send('Can not connect to database');
  }
});

module.exports = router;
