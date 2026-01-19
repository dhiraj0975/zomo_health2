import json
import csv
import os
import sys

def convert():
    # We only care about argv[1] : JSON file path
    if len(sys.argv) < 2:
        print("ERROR: No JSON file path provided")
        sys.exit(1)

    json_path = sys.argv[1].strip()

    if not json_path:
        print("ERROR: JSON file path is empty")
        sys.exit(1)

    if not os.path.isfile(json_path):
        print(f"ERROR: File not found : {json_path}")
        sys.exit(1)

    # Read and validate JSON
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Must be list of lists
    if not isinstance(data, list) or len(data) == 0:
        print("ERROR: JSON must be a non-empty array")
        sys.exit(1)

    if not all(isinstance(row, list) for row in data):
        print("ERROR: All rows must be lists (table format required)")
        sys.exit(1)

    # Write CSV
    csv_path = os.path.splitext(json_path)[0] + ".csv"

    with open(csv_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerows(data)

    print(f"Done : {csv_path}")


try:
    convert()
except Exception as e:
    print(f"ERROR: Unexpected failure : {str(e)}")
    sys.exit(1)