const express = require("express");
const database = require("./config/database");
require("dotenv").config();
database.connect();
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const swaggerJsDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();
const port = process.env.PORT;

// CORS
const cors = require("cors");
app.use(cors());
// end CORS

// body parser
app.use(bodyParser.json());
// end body parser

// cookie parser
app.use(cookieParser());
// end cookie parser

// Swagger setup
const swaggerOptions = {
  swaggerDefinition: {
    openapi: "3.0.0",
    info: {
      title: "Your API Title",
      version: "1.0.0",
      description: "API documentation",
    },
    servers: [
      {
        url: `http://localhost:${port}/api/v1`, // Update the base URL to include /api/v1
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "Custom string token for API authentication",
        },
      },
    },
    security: [
      {
        bearerAuth: [], // Apply the Bearer token globally to all routes
      },
    ],
  },
  apis: ["./api/v1/router/*.js"], // Path to your API files
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocs));
// end Swagger setup

// router v1
const routerAPIVer1 = require("./api/v1/router/index.router");
routerAPIVer1(app);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  console.log(
    `API documentation is available at http://localhost:${port}/api-docs`
  );
});
