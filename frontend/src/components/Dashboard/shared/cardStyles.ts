export const cardBaseStyles = `
  h-full
  w-full
  flex flex-col
  border
  shadow-sm p-4 rounded-xl 
  transition-all duration-200
`;

export const cardContentStyles = `
  flex-1
  flex
  flex-col
  justify-between
`;

export const cardDescriptionStyles = `
  mt-2
  text-sm
  text-gray-600 dark:text-gray-400
  line-clamp-2
  min-h-[2.5rem]
  break-words
`;

export const cardGridStyles = `
  grid
  grid-cols-1
  md:grid-cols-2
  lg:grid-cols-3
  gap-3
`; 