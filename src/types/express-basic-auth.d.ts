declare module 'express-basic-auth' {
  import { RequestHandler } from 'express';

  interface BasicAuthOptions {
    users?: { [key: string]: string };
    challenge?: boolean;
    realm?: string;
  }

  function basicAuth(options: BasicAuthOptions): RequestHandler;

  export = basicAuth;
}
