import { toPosixPath } from "@common/utils/filesystem/path";


// eslint-disable-next-line no-extend-native
String.prototype.toPosix = function (this: string): string {
  return toPosixPath(this);
};

declare global {
  interface String {
    toPosix: () => string;
  }
}
