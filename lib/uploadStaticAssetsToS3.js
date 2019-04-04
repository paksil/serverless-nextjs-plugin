const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const walkDir = require("klaw");
const mime = require("mime");
const logger = require("../utils/logger");
const toPosix = require("../utils/pathToPosix");

const uploadStaticAssetsToS3 = ({
  staticAssetsPath,
  bucketName,
  providerRequest
}) => {
  return new Promise((resolve, reject) => {
    const uploadPromises = [];

    logger.log(`Uploading static assets to ${bucketName} ...`);

    walkDir(staticAssetsPath)
      .on("data", item => {
        const itemPath = item.path;
        const isFile = !fs.lstatSync(itemPath).isDirectory();
        const posixItemPath = toPosix(item.path);

        if (isFile) {
          uploadPromises.push(
            providerRequest("S3", "upload", {
              ACL: "public-read",
              Bucket: bucketName,
              Key: path.posix.join(
                "_next",
                posixItemPath.substring(
                  posixItemPath.indexOf("/static"),
                  posixItemPath.length
                )
              ),
              ContentType: mime.getType(itemPath),
              ContentEncoding: 'gzip',
              Body: fs.createReadStream(itemPath).pipe(zlib.createGzip())
            })
          );
        }
      })
      .on("end", () => {
        Promise.all(uploadPromises)
          .then(results => {
            logger.log("Upload finished");
            resolve(results.length);
          })
          .catch(() => {
            reject(new Error("File upload failed"));
          });
      });
  });
};

module.exports = uploadStaticAssetsToS3;
