type MatchedTaskResult =
  | {
      variant: "with-task";
      prefix: string;
      taskNumber: string;
      description: string | null;
    }
  | {
      variant: "no-task";
      description: string;
    };

// 2 captial letters, followed by a dash, followed by 1 or more numbers, it can have additional text after the numbers if there is a hypen surrounded by spaces

// eg AC-1234 - Test description

// make a function that extracts the following

// Prefix 2 letters (eg AC) or null if there is no prefix
// Task number (eg 1234) or null if there is no task number

// description (eg Test description) or null if there is no description

const taskRegex = /^([A-Z]{2})-([0-9]+)(?:\s-\s(.+))?$/;

export const matchTaskRegex = (rawDescription: string): MatchedTaskResult => {
  const match = rawDescription.match(taskRegex);

  if (match) {
    const [, prefix, taskNumber, customDescription] = match;

    if (prefix && taskNumber) {
      return {
        variant: "with-task",
        prefix,
        taskNumber,
        description: customDescription ? customDescription.trim() : null,
      };
    }
  }

  return {
    variant: "no-task",
    description: rawDescription,
  };
};
