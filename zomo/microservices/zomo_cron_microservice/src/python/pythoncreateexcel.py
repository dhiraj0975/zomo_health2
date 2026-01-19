import sys
import json
import pandas as pd
import os

def create_excel_from_json(final_data, output_dir):
    filename = final_data["filename"]
    
    if filename.endswith(".json"):
        filename = filename.replace(".json", ".xlsx")

    excel_path = os.path.join(output_dir, filename)

    sequence = final_data["sequence"]

    min_width = 10
    max_width = 100
    base_multiplier = 1.1
    uppercase_extra = 2

    with pd.ExcelWriter(excel_path, engine='openpyxl') as writer:
        for item in sequence:
            sheet_name = item['sheet_name']
            data_list = item['list']

            headers = data_list[0]
            rows = data_list[1:]

            df = pd.DataFrame(rows, columns=headers)
            df.to_excel(writer, sheet_name=sheet_name, index=False)

            ws = writer.sheets[sheet_name]
            for i, col_name in enumerate(df.columns, start=1):
                col_letter = ws.cell(row=1, column=i).column_letter
                header_text = str(col_name)
                upper_ratio = sum(1 for c in header_text if c.isupper()) / len(header_text) if header_text else 0
                adjusted_width = max(len(header_text) * base_multiplier + upper_ratio * uppercase_extra, min_width)
                if adjusted_width > max_width:
                    adjusted_width = max_width
                ws.column_dimensions[col_letter].width = adjusted_width

    print(f"Excel file '{excel_path}' created successfully.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: Missing JSON file path argument", file=sys.stderr)
        sys.exit(2)

    json_path = sys.argv[1]

    if not os.path.exists(json_path):
        print(f"Error: File does not exist - {json_path}", file=sys.stderr)
        sys.exit(2)

    try:
        output_dir = os.path.dirname(json_path)

        with open(json_path, 'r') as f:
            data = json.load(f)

        create_excel_from_json(data, output_dir)

    except Exception as e:
        print(f"Error processing JSON: {e}", file=sys.stderr)
        sys.exit(1)