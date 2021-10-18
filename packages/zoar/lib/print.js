import find from './find.js'

const joinFilenames = (files, extraFiles) =>
  extraFiles ? [...new Set(files.concat(extraFiles))] : files

export const printAction = async (
  { files, footer, filenames: extra, out = process.stdout },
  options
) => {
  const filenames = await find(files, options)
  for (const filename of joinFilenames(filenames, extra)) {
    out.write(filename + '\n')
  }
  if (footer) {
    out.write(footer)
  }
}
