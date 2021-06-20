import express from "express";
import passport from "passport";
import * as passportCustom from "passport-custom";
import * as openApiValidator from "express-openapi-validator";
import {
  NotFound,
  Unauthorized,
} from "express-openapi-validator/dist/openapi.validator";

// should be imported as a pure TS interface
interface AuthorizedLineUser {
  userId: string;
}

// should be imported as a pure TS async function
const verifyLineIdToken = async (
  idToken: string
): Promise<AuthorizedLineUser | undefined> => {
  if (idToken.length < 4) {
    return;
  }
  return { userId: "HogeHogeHoge" };
};

// should be imported as a pure TS async function
const someService = async () => {
  // throw new Error("fwjeoiwjfoiwjefowiej");
  return 1 as any; //new Error("Service Error");
};

passport.use(
  new passportCustom.Strategy((req, done) => {
    const { authorization } = req.headers;
    if (!authorization) {
      done(new Error("There is no authorization header"));
      return;
    }
    const idToken = authorization.split("Bearer ")[1];
    verifyLineIdToken(idToken)
      .then((user) => {
        user ? done(null, user) : done(null, false);
      })
      .catch((err) => {
        done(err);
      });
  })
);

const customAuthorizer = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  passport.authenticate("custom", (err, user) => {
    if (err) {
      next(err);
    }
    req.user = user;
    next();
  })(req, res, next);
};

const app = express();
app.use(
  openApiValidator.middleware({
    apiSpec: "./openapi.yaml",
  })
);
app.use("/v1", passport.initialize());
app.use("/v1", customAuthorizer);

const handler =
  (
    asyncHandler: (req: express.Request, res: express.Response) => Promise<void>
  ): express.RequestHandler =>
  (req, res, next) =>
    asyncHandler(req, res).catch(next);

app.get("/health", (_req, res) => {
  res.status(200);
  res.json({ message: "ok" });
});

app.get(
  "/v1/test",
  handler(async (req, res) => {
    const { user } = req;
    if (!user) {
      res.status(401);
      res.json({ message: "Unauthorized" });
      return;
    }
    const { userId } = user as AuthorizedLineUser;
    await someService();
    res.status(200);
    res.json({ message: `Your LINE ID is '${userId}'` });
  })
);

app.use(
  (
    err: Unauthorized | Error,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (res.headersSent) {
      return next(err);
    }
    if (err instanceof Unauthorized) {
      res.status(401);
      res.json({ message: "Unauthorized" });
      return;
    }
    if (err instanceof NotFound) {
      res.status(404);
      res.json({ message: "Not Found" });
      return;
    }
    console.error(err);
    res.status(500);
    res.json({ messsage: "Internal Server Error" });
  }
);

app.listen(3000, () => {
  console.log("Started on port 3000.");
});
