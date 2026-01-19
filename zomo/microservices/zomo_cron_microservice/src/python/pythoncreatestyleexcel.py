import sys
import json
import pandas as pd
import os
from openpyxl.styles import PatternFill, Font

def create_excel_from_json(final_data, output_dir):
    filename = final_data["filename"]
    if filename.endswith(".json"):
        filename = filename.replace(".json", ".xlsx")
    
    excel_path = os.path.join(output_dir, filename)
    sequence = final_data["sequence"]
    
    min_width = 10
    max_width = 100
    base_multiplier = 1.2
    
    background_color = "eeeeee"  # Light gray
    font_weight = "bold"
    row_height = 18
    # Default columns to apply bold font
    default_columns_to_bold = []
    
    with pd.ExcelWriter(excel_path, engine='openpyxl') as writer:
        for sheet_index, item in enumerate(sequence):
            sheet_name = item['sheet_name']
            data_list = item['list']
            headers = data_list[0]
            rows = data_list[1:]
            rows_to_style = item.get("numericKeyIndices", [])
            
            # Extract arrays from last value of each row and create mapping
            row_column_mapping = {}  # {row_index: [columns_to_bold]}
            cleaned_rows = []
            
            for row_index, row in enumerate(rows):
                if row and len(row) > 0:
                    last_value = row[-1]
                    
                    # Check if last value is a list/array
                    if isinstance(last_value, list):
                        row_column_mapping[row_index] = last_value
                        # Remove the array from row
                        cleaned_row = row[:-1]
                    else:
                        cleaned_row = row
                    
                    cleaned_rows.append(cleaned_row)
            
            rows = cleaned_rows
            
            # Remove empty rows from the end
            while rows and all(not cell or str(cell).strip() == '' for cell in rows[-1]):
                rows.pop()
            
            
            df = pd.DataFrame(rows, columns=headers)
            
            if sheet_index == 0:
                df.to_excel(writer, sheet_name=sheet_name, index=False, header=False)
            else:
                df.to_excel(writer, sheet_name=sheet_name, index=False, header=True)
            
            ws = writer.sheets[sheet_name]
            
            # Calculate column widths based on content
            for i, col_name in enumerate(df.columns, start=1):
                col_letter = ws.cell(row=1, column=i).column_letter
                
                # Start with header length (for other sheets) or 0 (for first sheet)
                if sheet_index == 0:
                    max_length = 0
                else:
                    max_length = len(str(col_name))
                
                # Check all row values in this column
                for row_idx, row in enumerate(rows):
                    if i <= len(row):
                        cell_value = str(row[i-1]) if row[i-1] is not None else ""
                        cell_length = len(cell_value)
                        if cell_length > max_length:
                            max_length = cell_length
                
                # Calculate adjusted width
                adjusted_width = max_length * base_multiplier
                
                # Apply min and max constraints
                if adjusted_width < min_width:
                    adjusted_width = min_width
                if adjusted_width > max_width:
                    adjusted_width = max_width
                
                ws.column_dimensions[col_letter].width = adjusted_width
            
            if sheet_index == 0:
                for row in ws.iter_rows():
                    ws.row_dimensions[row[0].row].height = row_height

            # Apply styling only to the first sheet
            if sheet_index == 0:
                fill = PatternFill(start_color=background_color, end_color=background_color, fill_type="solid")
                bold_font = Font(bold=(font_weight == "bold"))
                normal_font = Font(bold=False)
                
                for row_num in rows_to_style:
                    # row_num + 1 because header is at row 1, data starts at row 2
                    excel_row = row_num
                    # Get columns to bold for this specific row
                    cols_to_bold = row_column_mapping.get(row_num - 1, default_columns_to_bold)
                    if excel_row <= ws.max_row:  # Check if row exists
                        for col in range(1, ws.max_column + 1):
                            cell = ws.cell(row=excel_row, column=col)
                            
                            # Apply background color to all columns
                            cell.fill = fill
                            
                            # Apply bold font only to specified columns for this row
                            if col in cols_to_bold:
                                cell.font = bold_font
                            else:
                                cell.font = normal_font
    
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