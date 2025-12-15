import CodeBlock from "./CodeBlock";

const blockStyles = {
  definition: "bg-green-50 text-gray-800 border-green-500 dark:bg-green-900/30 dark:text-gray-200",
  important: "bg-yellow-50 text-gray-800 border-yellow-500 dark:bg-yellow-900/30 dark:text-gray-200",
  pitfall: "bg-red-50 text-gray-800 border-red-500 dark:bg-red-900/30 dark:text-gray-200",
  note: "bg-blue-50 text-gray-800 border-blue-500 dark:bg-blue-900/30 dark:text-gray-200"
};


function ContentRenderer({ blocks }) {
  if (!blocks) return null;

  return (
    <div className="space-y-6">
      {blocks.map((block, index) => {
        switch (block.type) {

          case "explanation":
            return (
              <section key={index}>
                <h3 className="text-xl font-semibold mb-2">
                  {block.title}
                </h3>
                {block.text.map((t, i) => (
                  <p key={i} className="mb-2">
                    {t}
                  </p>
                ))}
              </section>
            );

          case "list":
            return (
              <section key={index}>
                <h4 className="font-semibold mb-2">
                  {block.title}
                </h4>
                <ul className="list-disc pl-6">
                  {block.items.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </section>
            );

          case "code":
            return (
              <CodeBlock
                key={index}
                title={block.title}
                language={block.language}
                code={block.code}
              />
            );

          case "comparison":
            return (
                <section key={index}>
                <h4 className="font-semibold mb-2">{block.title}</h4>

                <div className="overflow-x-auto">
                    <table className="w-full border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
                    <thead>
                        <tr className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200">
                        <th className="border border-gray-300 dark:border-gray-700 p-2 text-left">
                            Aspekt
                        </th>

                        {block.columns.map((col, i) => (
                            <th
                            key={i}
                            className="border border-gray-300 dark:border-gray-700 p-2 text-left"
                            >
                            {col}
                            </th>
                        ))}
                        </tr>
                    </thead>

                    <tbody className="bg-white text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                        {block.rows.map((row, rIdx) => (
                        <tr
                            key={rIdx}
                            className="odd:bg-gray-50 dark:odd:bg-gray-800/50"
                        >
                            <td className="border border-gray-300 dark:border-gray-700 p-2 font-medium">
                            {row.aspect}
                            </td>

                            {row.values.map((val, vIdx) => (
                            <td
                                key={vIdx}
                                className="border border-gray-300 dark:border-gray-700 p-2"
                            >
                                {val}
                            </td>
                            ))}
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
                </section>
            );


          case "note":
            return (
                <div
                key={index}
                className={`p-4 rounded border-l-4 ${blockStyles.note}`}
                >
                {block.text}
                </div>
            );


          case "warning":
            return (
              <div
                key={index}
                className="p-4 border-l-4 border-red-500 bg-red-50"
              >
                {block.text}
              </div>
            );

            case "definition":
                return (
                    <div
                    key={index}
                    className={`p-4 rounded border-l-4 ${blockStyles.definition}`}
                    >
                    <strong>{block.term}:</strong> {block.text}
                    </div>
                );


            case "important":
            return (
                <div
                key={index}
                className={`p-4 rounded border-l-4 font-medium ${blockStyles.important}`}
                >
                ⚠ {block.text}
                </div>
            );


            case "pitfall":
                return (
                    <div
                    key={index}
                    className={`p-4 rounded border-l-4 ${blockStyles.pitfall}`}
                    >
                    <strong>{block.title}</strong>
                    <p>{block.text}</p>
                    </div>
                );


            case "example":
            return (
                <section key={index}>
                <h4 className="font-semibold mb-2">{block.title}</h4>
                <ul className="list-disc pl-6">
                    {block.text.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
                </section>
            );

            case "summary":
            return (
                <div
                key={index}
                className="mt-6 p-4 rounded bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                >
                <h4 className="font-semibold mb-2">Kurz zusammengefasst</h4>
                <ul className="list-disc pl-6">
                    {block.points.map((p, i) => (
                    <li key={i}>{p}</li>
                    ))}
                </ul>
                </div>
            );


          default:
            return null;
        }
      })}
    </div>
  );
}

export default ContentRenderer;
