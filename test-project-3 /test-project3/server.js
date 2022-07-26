const fs = require("fs");
const http = require("http");
const url = require("url");
const qs = require("qs");
const checkType_login = require("./views/login/js/FileController/check_Login_Filetype");
const checkRegister = require("./views/login/js/FileController/signup");
const ProductModel = require("./js_connect/ProductModel")

const Connection = require("./js_connect/configToMySQL");

let connection = Connection.createConnection({ multipleStatements: true });
let home = false;
let login = false;
let signup = false;
let admin = false;
let user = false;
function getCate() {
  return new Promise((resolve, reject) => {
    let queryListCategories = `select name from categories
    order by id;`;
    connection.query(queryListCategories, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}
function LoginControl(req, res) {
  let data = "";
  req.on("data", (chunk) => (data += chunk));
  req.on("end", () => {
    let logindata = qs.parse(data);
    let stringUserName = logindata.username.toString();
    let userquery = `select * from users where username = '${stringUserName}' and password = '${logindata.password}';`;

    connection.query(userquery, (err, data) => {
      if (err) {
        console.log(err);
      } else {
        let parseData = qs.parse(data[0]);
        // console.log(parseData);
        if (parseData.username == null) {
          fs.readFile("./views/login/login.html", "utf-8", (err, data) => {
            if (err) {
              console.log(err);
            } else {
              res.writeHead(200, { "Content-Type": "text/html" });

              let text = `<p style="text-align: center; color: white; font-size: 30px">Tài khoản không tồn tại hoặc nhập sai mật khẩu</p>`;
              data = data.replace("{here}", text);
              res.write(data);
              return res.end();
            }
          });
        } else {
          let rolequery = `select ur.role_id from users u join userrole ur on u.id = ur.user_id where username = '${stringUserName}' and password = '${logindata.password}';`;
          connection.query(rolequery, async(err, data) => {
            console.log(parseData);
            if (err) {
              console.log(err);
            } else {
              // ========================================================
              // Set quyền cho tài khoản ...............
              let roleData = qs.parse(data[0]);
              console.log(roleData);
              let role = roleData.role_id;
              if (role === 1) {
                console.log("Tài khoản Admin");
                home = false;
                login = false;
                signup = false;
                admin = true;
                user = false;


                   await ProductModel.getProduct()
                        .then(listProduct=>{
                          fs.readFile("./views/home/admin.html", "utf-8",  (err, data) => {
                            if (err) {
                              console.log(err);
                            } else {

                              let html = '';
                              listProduct.forEach((product, index) => {
                                html += '<tr>'
                                html += `<td >${product.id}</td>`
                                html += `<td >${product.name}</td>`
                                html += `<td>${product.price}</td>`

                                html += `<td>
                                <button type="button" value="${product.id}" class="btn btn-danger"> <a href="/products/delete?id=${product.id}">Delete</a></button>
               
                                <button type="button" value="${product.id}" class="btn btn-warning"><a href="/products/update?id=${product.id}">Update</a></button>
                            </td>`

                                html += '</tr>'
                              })
                              data = data.replace('{list-products}', html)
                              res.writeHead(200, {"Content-Type": "text/html"})
                              res.write(data)
                              res.end();
                            }

                        })



                })


              } else if (role === 2) {
                console.log("Tài khoản User");
                home = false;
                login = false;
                signup = false;
                admin = false;
                user = true;
                fs.readFile("./views/home/user.html", "utf-8", (err, data) => {
                  if (err) {
                    console.log(err);
                  } else {
                    res.writeHead(200, { "Content-Type": "text/html" });
                    res.write(data);
                    return res.end();
                  }
                });
              }
            }
          });
          // ========================================================
        }
      }
    });
  });
}

const server = http.createServer((req, res) => {
  //Kiểm tra định dạng tệp req client của login & signup gửi lên server
  let mimeTypes={
    'jpg' : 'images/jpg',
    'png' : 'images/png',
    'js' :'text/javascript',
    'css' : 'text/css',
    'svg':'image/svg+xml',
    'ttf':'font/ttf',
    'woff':'font/woff',
    'woff2':'font/woff2',
    'eot':'application/vnd.ms-fontobject'
  }
  const filesDefences = req.url.match(/\.js|\.css|\.png|\.svg|\.jpg|\.ttf|\.woff|\.woff2|\.eot/)

  if(filesDefences){
    const tail=mimeTypes[filesDefences[0].toString().split('.')[1]]
    res.writeHead(200,{"Content-Type":tail })
    fs.createReadStream(__dirname + req.url).pipe(res)

  }

  //filePath control
  let urlParse = url.parse(req.url);
  let pathName = urlParse.pathname;
  switch (pathName) {
    case "/": {
      home = true;
      login = false;
      signup = false;
      fs.readFile("./views/home/index.html", "utf-8", async (err, data) => {
        if (err) {
          console.log(err);
        } else {
          let categories = await getCate();
          let cateText = "";
          for (let i = 0; i < categories.length; i++) {
            
            cateText += `<li data-filter=".oranges">${categories[i].name}</li>`;
          }
          data = data.replace("{catelogies}", cateText);
          res.writeHead(200, { "Content-Type": "text/html" });
          res.write(data);
          return res.end();
        }
      });
      break;
    }
    // case "/signup": {
    //   if (req.method === "GET") {
    //     fs.readFile(
    //       "./views/login/SignUpAccount.html",
    //       "utf-8",
    //       (err, data) => {
    //         if (err) {
    //           console.log(err);
    //         } else {
    //           res.writeHead(200, { "Content-Type": "text/html" });
    //           res.write(data);
    //           return res.end();
    //         }
    //       }
    //     );
    //   } else {
    //     checkRegister(req, res);
    //   }
    //   break;
    // }
    case "/login": {
      home = false;
      login = true;
      signup = false;
      //Data control login site
      if (req.method === "GET") {
        fs.readFile("./views/login/login.html", "utf-8", (err, data) => {
          if (err) {
            console.log(err);
          } else {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.write(data);
            return res.end();
          }
        });
      } else {
        LoginControl(req, res);
      }
      break;
    }

    case "/products/delete": {

      console.log(req.url)
      const parseUrl = url.parse(req.url, true)
      let  indexParse=qs.parse(parseUrl.query).id;
       ProductModel.deleteProduct(indexParse)
          .then(result=>{
            res.writeHead(301,{location:'/login'})
            res.end();
          })
          .catch()

      break;
    }


    case "/signup": {
      home = false;
      login = false;
      signup = true;
      if (req.method === "GET") {
        fs.readFile(
          "./views/login/SignUpAccount.html",
          "utf-8",
          (err, data) => {
            if (err) {
              console.log(err);
            } else {
              res.writeHead(200, { "Content-Type": "text/html" });
              res.write(data);
              return res.end();
            }
          }
        );
      } else {
        checkRegister.SignUpAccount(req, res);
      }
      break;
    }
    // default: {
    //   fs.readFile("./views/404-error.html", "utf-8", (err, data) => {
    //     if (err) {
    //       console.log(err);
    //     } else {
    //       res.writeHead(200, { "Content-Type": "text/html" });
    //       res.write(data);
    //       return res.end();
    //     }
    //   });
    // }


  }
  if (home === true) {
    let path = "./views/home";
    checkType_login(req, res, path);
  }
  if (login === true) {
    let path = "./views/login";
    checkType_login(req, res, path);
  }
  if (signup === true) {
    let path = "./views/login";
    checkType_login(req, res, path);
  }
  if (user === true) {
    let path = "./views/home";
    checkType_login(req, res, path);
  }
});

server.listen(8000, () => {
  console.log("Server is running on http://localhost:8000");
});
