import os
from os.path import isfile
import numpy as np
import pandas as pd
import json
from sklearn.model_selection import train_test_split


# ================ Small auxiliary functions =================

def read_solutions(data_dir):
    ''' Function to read the Labels from CSV files'''

    #----------------------------------------------------------------
    # Settings
    #----------------------------------------------------------------
    JSON_PATH = os.path.join(data_dir,"info.json")
    CSV_PATH = os.path.join(data_dir,"labels.csv")
    
    #Check JSON file
    if not os.path.isfile(JSON_PATH):
        print('[-] JSON file Not Found')
        print('Make sure your dataset is in this format: https://github.com/ihsaan-ullah/meta-album/tree/master/DataFormat')
        return

    #Check CSV file
    if not os.path.isfile(CSV_PATH):
        print('[-] CSV file Not Found')
        print('Make sure your dataset is in this format: https://github.com/ihsaan-ullah/meta-album/tree/master/DataFormat')
        return 
    

    #----------------------------------------------------------------
    # Read JSON
    #----------------------------------------------------------------
    f = open (JSON_PATH, "r")
    info = json.loads(f.read())


    #----------------------------------------------------------------
    # Load CSV
    #----------------------------------------------------------------
    data_df = pd.read_csv(CSV_PATH)
        
    
    

    #----------------------------------------------------------------
    # Check Columns in CSV
    #----------------------------------------------------------------
    csv_columns = data_df.columns





    #Category 
    if not info["category_column_name"] in csv_columns:
        print('[-] Column Not Found : ' + info["category_column_name"])
        return


    #----------------------------------------------------------------
    # Settings from info JSON file
    #----------------------------------------------------------------

    # category column name in csv
    CATEGORY_COLUMN = info["category_column_name"]

    # style column name in csv
    STYLE_COLUMN = info["style_column_name"]



    data_df['label_cat'] = data_df[CATEGORY_COLUMN].astype('category')
    
    data_df['style_cat'] = data_df[STYLE_COLUMN].astype('category')

    
    train_data, test_data = train_test_split(
        data_df, test_size=0.5, 
        random_state=420, shuffle=True, 
        stratify=data_df[[CATEGORY_COLUMN, STYLE_COLUMN]]
    )

    train_data = under_sample(train_data, secondary_ratio=0.5)

    
    print("###-------------------------------------###")
    print("### Total solutions : ",  data_df.shape[0])
    print("### Train solutions : ", train_data.shape[0])
    print("### Test solutions : ", test_data.shape[0])
    print("###-------------------------------------###\n\n")
    
    
    train_solution =  np.asarray(train_data['label_cat'].cat.codes.values)
    test_solution = np.asarray(test_data['label_cat'].cat.codes.values)

    train_style = np.asarray(train_data['style_cat'].cat.codes.values)
    test_style = np.asarray(test_data['style_cat'].cat.codes.values)

    solutions = [(train_solution, train_style), (test_solution, test_style)]

    solution_names = ['train', 'test']
    
    print("###-------------------------------------###")
    print("### Solutions files are ready!")
    print("###-------------------------------------###\n\n")
    
    return (solution_names,solutions)


def under_sample(df, secondary_ratio=0.5):
    """
    Subsample classes with respect to style to create imbalance.
    """
    styles = np.sort(df["STYLE"].unique())
    categories = np.sort(df["CATEGORY"].unique())
    dfs_keep = []
    for i, style in enumerate(styles):
        # Get the images per style
        df_per_style = df.loc[df["STYLE"] == style]
        
        for j, category in enumerate(categories):
            # Get images per category
            df_per_style_category = df_per_style.loc[df_per_style["CATEGORY"] == category]
            
            if i == j:
                keep_ratio = 1.0
            else:
                keep_ratio = secondary_ratio

            n = len(df_per_style_category)
            n_keep = int(n * keep_ratio)
            
            dfs_keep.append(df_per_style_category.head(n_keep))
            
    df_keep = pd.concat(dfs_keep, ignore_index=True)
    
    # Final shuffle
    n_keep = len(df_keep)
    np.random.seed(420)
    permutations = np.random.permutation(n_keep)
    df_keep = df_keep.iloc[permutations].reset_index(drop=True)

    return df_keep