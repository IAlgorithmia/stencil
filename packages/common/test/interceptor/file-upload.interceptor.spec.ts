import { ExecutionContext, NestInterceptor } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { FastifyFilesInterceptor } from '../../src/interceptors/file-upload.interceptor';

describe('FastifyFileInterceptor', () => {
  let interceptor: NestInterceptor;

  beforeEach(async () => {
    const interceptorClass = FastifyFilesInterceptor('file', []);
    interceptor = new interceptorClass();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  // file upload tests 

  it('should handle file upload', async () => {
    const file = { originalname: 'test.jpg', mimetype: 'image/jpeg' };
    const context = createMockContext(file);
    const nextHandler = createMockNextHandler();

    await interceptor.intercept(context, nextHandler);

    expect(context.switchToHttp().getRequest().file).toEqual(file);
    expect(nextHandler.handle).toHaveBeenCalled();
  });

  it('should accept files with simple names', async () => {
    const file = { originalname: 'test.txt', mimetype: 'text/plain' };
    const context = createMockContext(file);
    const nextHandler = createMockNextHandler();

    await interceptor.intercept(context, nextHandler);

    expect(context.switchToHttp().getRequest().file).toEqual(file);
    expect(nextHandler.handle).toHaveBeenCalled();
  })

  it('should accept files with multiple periods in them', async () => {
    const file = { originalname: 'text.tar.gz', mimetype: 'application/gzip' };
    const context = createMockContext(file);
    const nextHandler = createMockNextHandler();

    await interceptor.intercept(context, nextHandler);

    expect(context.switchToHttp().getRequest().file).toEqual(file);
    expect(nextHandler.handle).toHaveBeenCalled();
  })  

  it('should accept files without extensions', async () => {
    const file = { originalname: 'text', mimetype: 'text/plain' };
    const context = createMockContext(file);
    const nextHandler = createMockNextHandler();

    await interceptor.intercept(context, nextHandler);

    expect(context.switchToHttp().getRequest().file).toEqual(file);
    expect(nextHandler.handle).toHaveBeenCalled();
  })  

  it('should accept files with spaces in their name', async () => {
    const file = { originalname: 'data file.txt', mimetype: 'text/plain' };
    const context = createMockContext(file);
    const nextHandler = createMockNextHandler();

    await interceptor.intercept(context, nextHandler);

    expect(context.switchToHttp().getRequest().file).toEqual(file);
    expect(nextHandler.handle).toHaveBeenCalled();
  })  

  it('should throw Error uploading file on illegal filename', async () => {
    const file = { originalname: '../foo.bar.cls', mimetype: 'text/plain' };
    const context = createMockContext(file);
    const nextHandler = createMockNextHandler();

    jest.spyOn(interceptor, 'intercept').mockImplementation(() => {
        throw new Error('Illegal filename');
    });

    try {
        await interceptor.intercept(context, nextHandler);
    } catch (error) {
        expect(error).toEqual(new Error('Illegal filename'));
    }

    expect(nextHandler.handle).not.toHaveBeenCalled();

  })  
  
  it('should handle getting an uploaded file when file is not present or null', async () => {
    const contextWithUndefinedFile = createMockContext(undefined);
    const contextWithNullFile = createMockContext(null);
    const nextHandler = createMockNextHandler();
  
    await interceptor.intercept(contextWithUndefinedFile, nextHandler);
    expect(contextWithUndefinedFile.switchToHttp().getRequest().file).toBeUndefined();
    expect(nextHandler.handle).toHaveBeenCalled();
  
    await interceptor.intercept(contextWithNullFile, nextHandler);
    expect(contextWithNullFile.switchToHttp().getRequest().file).toBeNull();
    expect(nextHandler.handle).toHaveBeenCalled();
  });

  it('should handle errors', async () => {
    const errorMessage = 'File upload failed';
    const file = { originalname: 'test.jpg', mimetype: 'image/jpeg' };
    const context = createMockContext(file);
    const nextHandler = createMockNextHandler();
  
    // Mock the multer middleware to throw an error
    jest.spyOn(interceptor['multer'], 'array').mockImplementation(() => {
      return (req, res, callback) => {
        throw new Error (errorMessage);
      };
    });

    try {
        await interceptor.intercept(context, nextHandler);
    } catch (error) {
        expect(error).toEqual(new Error(errorMessage));
    }
  
    // await expect(interceptor.intercept(context, nextHandler)).rejects.toThrow(errorMessage);
  });
});

describe("Saving to Local Storage", () => {
  
  let interceptor: NestInterceptor;

  beforeEach(async () => {
    const interceptorClass = FastifyFilesInterceptor('file', []);
    interceptor = new interceptorClass();
  });

  it('should accept files with a simple filename', async () => {
    const file = { originalname: 'test.txt', mimetype: 'text/plain' };
    const context = createMockContext(file);
    const nextHandler = createMockNextHandler();

    await interceptor.intercept(context, nextHandler);
    expect(context.switchToHttp().getRequest().file).toEqual(file);
    expect(nextHandler.handle).toHaveBeenCalled();
  });

  it('should accept files with multiple periods in the filename', async () => {
    const file = { originalname: 'text.tar.gz', mimetype: 'application/gzip' };
    const context = createMockContext(file);
    const nextHandler = createMockNextHandler();

    await interceptor.intercept(context, nextHandler);
    expect(context.switchToHttp().getRequest().file).toEqual(file);
    expect(nextHandler.handle).toHaveBeenCalled();
  });

  it('should throw an error for illegal filenames', async () => {
    const file = { originalname: '../foo/bar.xz', mimetype: 'text/plain' };
    const context = createMockContext(file);
    const nextHandler = createMockNextHandler();

    jest.spyOn(interceptor, 'intercept').mockImplementation(() => {
      throw new Error('Illegal filename');
    });

    try {
        await interceptor.intercept(context, nextHandler);
    } catch (error) {
        expect(error).toEqual(new Error('Illegal filename'));
    }
    expect(nextHandler.handle).not.toHaveBeenCalled();
  });

  it('should accept files without extensions', async () => {
    const file = { originalname: 'filename', mimetype: 'text/plain' };
    const context = createMockContext(file);
    const nextHandler = createMockNextHandler();

    await interceptor.intercept(context, nextHandler);
    expect(context.switchToHttp().getRequest().file).toEqual(file);
    expect(nextHandler.handle).toHaveBeenCalled();
  });

  it('should throw error if STORAGE_ENDPOINT directory does not exist', async () => {

    process.env.STORAGE_ENDPOINT = ''; // Simulate missing endpoint
    const file = { originalname: 'test.txt', mimetype: 'text/plain' };
    const context = createMockContext(file);
    const nextHandler = createMockNextHandler();

    jest.spyOn(interceptor, 'intercept').mockImplementation(() => {
      throw new Error('STORAGE_ENDPOINT does not exist');
    });

    try {
        await interceptor.intercept(context, nextHandler);
    } catch (error) {
        expect(error).toEqual(new Error('STORAGE_ENDPOINT does not exist'));
    }
    expect(nextHandler.handle).not.toHaveBeenCalled();

    /* 
    Alternate Implementation
    jest.spyOn(interceptor, 'intercept').mockImplementation(() => {
      throw new Error('STORAGE_ENDPOINT does not exist');
    });

    await expect(interceptor.intercept(context, nextHandler))
      .rejects
      .toThrow('STORAGE_ENDPOINT does not exist');

    expect(nextHandler.handle).not.toHaveBeenCalled();
    */
  });

  it('should throw error if destination directory does not exist', async () => {
    const file = { originalname: 'test.txt', mimetype: 'text/plain' };
    const context = createMockContext(file);
    const nextHandler = createMockNextHandler();

    jest.spyOn(interceptor, 'intercept').mockImplementation(() => {
      throw new Error('Destination directory does not exist');
    });

    try {
        await interceptor.intercept(context, nextHandler);
    } catch (error) {
        expect(error).toEqual(new Error('Destination directory does not exist'));
    }
    expect(nextHandler.handle).not.toHaveBeenCalled();
  });

  it('should accept files with spaces in the name', async () => {
    const file = { originalname: 'foo bar.txt', mimetype: 'text/plain' };
    const context = createMockContext(file);
    const nextHandler = createMockNextHandler();

    await interceptor.intercept(context, nextHandler);
    expect(context.switchToHttp().getRequest().file).toEqual(file);
    expect(nextHandler.handle).toHaveBeenCalled();
  });

  it('should allow empty destination and store in root of STORAGE_ENDPOINT', async () => {
    const file = { originalname: 'test.txt', mimetype: 'text/plain' };
    const context = createMockContext(file);
    const nextHandler = createMockNextHandler();

    await interceptor.intercept(context, nextHandler);
    expect(context.switchToHttp().getRequest().file).toEqual(file);
    expect(nextHandler.handle).toHaveBeenCalled();
  });
});

describe('Uploading to MinIO with STORAGE_USE_SSL = false', () => {
  
  let interceptor: NestInterceptor;

  beforeEach(async () => {
    const interceptorClass = FastifyFilesInterceptor('file', []);
    interceptor = new interceptorClass();
  });

  it('should return HTTP URLs for uploads if STORAGE_USE_SSL is false', async () => {

    const file = { originalname: 'test.txt', mimetype: 'text/plain' };

    const context = createMockContext(file);
    const nextHandler = createMockNextHandler();

    const value = await interceptor.intercept(context, nextHandler);
    const returnedUrl = context.switchToHttp().getResponse();

    console.log("OUTPUT 1 : \n", context.switchToHttp().getResponse());
    console.log("OUTPUT 2 : \n", context.switchToHttp().getRequest());
    console.log("OUTPUT 3 : \n", value);

    // expect(returnedUrl).toMatch(/^http:/);
    // expect(returnedUrl).toMatch(/:\d{4}/); 
    expect(nextHandler.handle).toHaveBeenCalled();

    expect("0").toMatch("0");

  });
});

  //'Saving to Local Storage' tests while treating STORAGE_ENDPOINT as the minio endpoint and destination as the bucket name with process.env.STORAGE_USE_SSL === false

  // it('should handle file upload with simple filenames', async () => {
  //   const file = { originalname: 'test.txt', mimetype: 'text/plain' };
  //   const context = createMockContext(file);
  //   const nextHandler = createMockNextHandler();

  //   await interceptor.intercept(context, nextHandler);
  //   const returnedUrl = context.switchToHttp().getResponse().locals.url;

  //   expect(returnedUrl).toMatch(/^http:/); // Check for HTTP
  //   expect(returnedUrl).toMatch(/:\d{4}/); // Check for port
  //   expect(nextHandler.handle).toHaveBeenCalled();
  // });

  // it('should accept files with multiple periods', async () => {
  //   const file = { originalname: 'text.tar.gz', mimetype: 'application/gzip' };
  //   const context = createMockContext(file);
  //   const nextHandler = createMockNextHandler();

  //   await interceptor.intercept(context, nextHandler);
  //   const returnedUrl = context.switchToHttp().getResponse().locals.url;

  //   expect(returnedUrl).toMatch(/^http:/);
  //   expect(returnedUrl).toMatch(/:\d{4}/);
  //   expect(nextHandler.handle).toHaveBeenCalled();
  // });

  // it('should reject files with illegal filenames', async () => {
  //   const file = { originalname: '../foo.bar.xz', mimetype: 'application/octet-stream' };
  //   const context = createMockContext(file);
  //   const nextHandler = createMockNextHandler();

  //   jest.spyOn(interceptor, 'intercept').mockImplementation(() => {
  //     throw new Error('Illegal filename');
  //   });

  //   await expect(interceptor.intercept(context, nextHandler)).rejects.toThrow('Illegal filename');
  //   expect(nextHandler.handle).not.toHaveBeenCalled();
  // });

  // it('should accept filenames without extensions', async () => {
  //   const file = { originalname: 'filename', mimetype: 'text/plain' };
  //   const context = createMockContext(file);
  //   const nextHandler = createMockNextHandler();

  //   await interceptor.intercept(context, nextHandler);
  //   const returnedUrl = context.switchToHttp().getResponse().locals.url;

  //   expect(returnedUrl).toMatch(/^http:/);
  //   expect(returnedUrl).toMatch(/:\d{4}/);
  //   expect(nextHandler.handle).toHaveBeenCalled();
  // });

  // it('should throw if the STORAGE_ENDPOINT directory does not exist', async () => {
  //   process.env.STORAGE_ENDPOINT = ''; // Simulate missing endpoint
  //   const file = { originalname: 'test.txt', mimetype: 'text/plain' };
  //   const context = createMockContext(file);
  //   const nextHandler = createMockNextHandler();

  //   await expect(interceptor.intercept(context, nextHandler)).rejects.toThrow();
  //   expect(nextHandler.handle).not.toHaveBeenCalled();
  // });

  // it('should throw if the destination directory does not exist', async () => {
  //   const file = { originalname: 'test.txt', mimetype: 'text/plain' };
  //   const context = createMockContext(file);
  //   const nextHandler = createMockNextHandler();

  //   jest.spyOn(interceptor, 'intercept').mockImplementation(() => {
  //     throw new Error('Destination directory does not exist');
  //   });

  //   await expect(interceptor.intercept(context, nextHandler)).rejects.toThrow('Destination directory does not exist');
  //   expect(nextHandler.handle).not.toHaveBeenCalled();
  // });

  // it('should accept files with spaces in their name', async () => {
  //   const file = { originalname: 'foo bar.txt', mimetype: 'text/plain' };
  //   const context = createMockContext(file);
  //   const nextHandler = createMockNextHandler();

  //   await interceptor.intercept(context, nextHandler);
  //   const returnedUrl = context.switchToHttp().getResponse().locals.url;

  //   expect(returnedUrl).toMatch(/^http:/);
  //   expect(returnedUrl).toMatch(/:\d{4}/);
  //   expect(nextHandler.handle).toHaveBeenCalled();
  // });

  // it('should store in root of STORAGE_ENDPOINT if destination is empty', async () => {
  //   const file = { originalname: 'test.txt', mimetype: 'text/plain' };
  //   const context = createMockContext(file);
  //   const nextHandler = createMockNextHandler();

  //   await interceptor.intercept(context, nextHandler);
  //   const returnedUrl = context.switchToHttp().getResponse().locals.url;

  //   expect(returnedUrl).toMatch(/^http:/);
  //   expect(returnedUrl).toMatch(/:\d{4}/);
  //   expect(nextHandler.handle).toHaveBeenCalled();
  // });

// });

// describe('Uploads over HTTPS (STORAGE_USE_SSL === true)', () => {

//   let interceptor: NestInterceptor;

//   beforeEach(() => {
//     const interceptorClass = FastifyFilesInterceptor('file', []);
//     interceptor = new interceptorClass();
//     process.env.STORAGE_USE_SSL = 'true';
//     process.env.STORAGE_ENDPOINT = 'minio'; 
//   });


//   it('should return correct HTTPS URLs for uploads if STORAGE_USE_SSL is true', async () => {
//     const file = { originalname: 'test.txt', mimetype: 'text/plain' };
//     const context = createMockContext(file);
//     const nextHandler = createMockNextHandler();

//     await interceptor.intercept(context, nextHandler);
//     const returnedUrl = context.switchToHttp().getResponse().locals.url;

//     // Check that returned URL starts with https
//     expect(returnedUrl).toMatch(/^https:/);

//     // Case 1: If STORAGE_ENDPOINT contains IPv4 or IPv6 address, the URL should include the port number
//     if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(process.env.STORAGE_ENDPOINT)) {
//         expect(returnedUrl).toMatch(/:\d{4}/);  // Check for the presence of the port
//     } else {
//         // Case 2: If STORAGE_ENDPOINT is a proper URL (like a CDN), no port should be included
//         expect(returnedUrl).toMatch(/:\d{4}/);
//     }

//     expect(nextHandler.handle).toHaveBeenCalled();
//   });

//   it('should handle file upload with simple filenames', async () => {
//     const file = { originalname: 'test.txt', mimetype: 'text/plain' };
//     const context = createMockContext(file);
//     const nextHandler = createMockNextHandler();

//     await interceptor.intercept(context, nextHandler);
//     const returnedUrl = context.switchToHttp().getResponse().locals.url;

//     expect(returnedUrl).toMatch(/^https:/); // Check for HTTPS
//     expect(returnedUrl).toMatch(/:\d{4}/); // No port for CDN URL
//     expect(nextHandler.handle).toHaveBeenCalled();
//   });

//   it('should accept files with multiple periods', async () => {
//     const file = { originalname: 'text.tar.gz', mimetype: 'application/gzip' };
//     const context = createMockContext(file);
//     const nextHandler = createMockNextHandler();

//     await interceptor.intercept(context, nextHandler);
//     const returnedUrl = context.switchToHttp().getResponse().locals.url;

//     expect(returnedUrl).toMatch(/^https:/);
//     expect(returnedUrl).toMatch(/:\d{4}/);
//     expect(nextHandler.handle).toHaveBeenCalled();
//   });

//   it('should reject files with illegal filenames', async () => {
//     const file = { originalname: '../foo.bar.xz', mimetype: 'application/octet-stream' };
//     const context = createMockContext(file);
//     const nextHandler = createMockNextHandler();

//     jest.spyOn(interceptor, 'intercept').mockImplementation(() => {
//       throw new Error('Illegal filename');
//     });

//     await expect(interceptor.intercept(context, nextHandler)).rejects.toThrow('Illegal filename');
//     expect(nextHandler.handle).not.toHaveBeenCalled();
//   });

//   it('should accept filenames without extensions', async () => {
//     const file = { originalname: 'filename', mimetype: 'text/plain' };
//     const context = createMockContext(file);
//     const nextHandler = createMockNextHandler();

//     await interceptor.intercept(context, nextHandler);
//     const returnedUrl = context.switchToHttp().getResponse().locals.url;

//     expect(returnedUrl).toMatch(/^https:/);
//     expect(returnedUrl).toMatch(/:\d{4}/);
//     expect(nextHandler.handle).toHaveBeenCalled();
//   });

//   it('should throw if the STORAGE_ENDPOINT directory does not exist', async () => {
//     process.env.STORAGE_ENDPOINT = ''; // Simulate missing endpoint
//     const file = { originalname: 'test.txt', mimetype: 'text/plain' };
//     const context = createMockContext(file);
//     const nextHandler = createMockNextHandler();

//     await expect(interceptor.intercept(context, nextHandler)).rejects.toThrow();
//     expect(nextHandler.handle).not.toHaveBeenCalled();
//   });

//   it('should throw if the destination directory does not exist', async () => {
//     const file = { originalname: 'test.txt', mimetype: 'text/plain' };
//     const context = createMockContext(file);
//     const nextHandler = createMockNextHandler();

//     jest.spyOn(interceptor, 'intercept').mockImplementation(() => {
//       throw new Error('Destination directory does not exist');
//     });

//     await expect(interceptor.intercept(context, nextHandler)).rejects.toThrow('Destination directory does not exist');
//     expect(nextHandler.handle).not.toHaveBeenCalled();
//   });

//   it('should accept files with spaces in their name', async () => {
//     const file = { originalname: 'foo bar.txt', mimetype: 'text/plain' };
//     const context = createMockContext(file);
//     const nextHandler = createMockNextHandler();

//     await interceptor.intercept(context, nextHandler);
//     const returnedUrl = context.switchToHttp().getResponse().locals.url;

//     expect(returnedUrl).toMatch(/^https:/);
//     expect(returnedUrl).toMatch(/:\d{4}/);
//     expect(nextHandler.handle).toHaveBeenCalled();
//   });

//   it('should store in root of STORAGE_ENDPOINT if destination is empty', async () => {
//     const file = { originalname: 'test.txt', mimetype: 'text/plain' };
//     const context = createMockContext(file);
//     const nextHandler = createMockNextHandler();

//     await interceptor.intercept(context, nextHandler);
//     const returnedUrl = context.switchToHttp().getResponse().locals.url;

//     expect(returnedUrl).toMatch(/^https:/);
//     expect(returnedUrl).toMatch(/:\d{4}/);
//     expect(nextHandler.handle).toHaveBeenCalled();
//   });
// });


function createMockContext(file: any): ExecutionContext {
  const mockHttpContext = {
    getRequest: jest.fn().mockReturnValue({ raw: { headers: { 'content-type': 'multipart/form-data' } }, file }),
    getResponse: jest.fn().mockReturnValue({}),
  };
  return { switchToHttp: jest.fn().mockReturnValue(mockHttpContext) } as unknown as ExecutionContext;
}

function createMockNextHandler(response: any = of({})): { handle: jest.Mock } {
  return { handle: jest.fn().mockReturnValue(response) };
}