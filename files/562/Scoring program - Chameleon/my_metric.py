'''Examples of organizer-provided metrics.
You can just replace this code by your own.
Make sure to indicate the name of the function that you chose as metric function
in the file metric.txt. E.g. mse_metric, because this file may contain more 
than one function, hence you must specify the name of the function that is your metric.'''

import numpy as np
import scipy as sp
from scipy.stats import hmean

def mse_metric(solution, prediction):
    '''Mean-square error.
    Works even if the target matrix has more than one column'''
    mse = np.mean((solution-prediction)**2)
    return np.mean(mse)

def accuracy_harmonic_mean(solution, prediction):
    """
    The harmonic mean of the accuracies of each group of category/style combination
    """
    if type(solution) == tuple:
        solution, solution_style = solution
    else:
        return 0
    
    solution = solution.reshape(-1)
    prediction = prediction.reshape(-1)
    categories = np.unique(solution).reshape(-1)
    
    eps = 1e-10
    weights = []
    accuracies = []
    for category in categories:
        for style in categories:
            idx = np.where((solution == category) & (solution_style == style))
            
            sub_solution = solution[idx]
            sub_prediction = prediction[idx]
            
            if category == style:
                weight = 0.05
            else:
                weight = 0.9
            
            if sub_solution.shape[0] == 0:
                accuracy = 1.0
            else:
                accuracy = (sub_solution == sub_prediction).sum() / sub_solution.shape[0]

            weights.append(weight)
            accuracies.append(accuracy)

    print("weights:", weights)
    print("accuracies:", accuracies)
    return hmean(accuracies, weights=weights)


def inv_error_quadratic_mean(solution, prediction):
    """
    The harmonic mean of the accuracies of each group of category/style combination.
    
    The error of each group is defined as 1 - accuracy
    We use the quadratic mean (root mean square) because it scales with the biggest values in the set, as an alternative to the harmonic/geometric mean that goes to 0 when at least one element of the set is 0.
    
    This way, big errors will cause the mean error to grow fast, and thus 1 - mean error to go down as fast.
    """
    
    if type(solution) == tuple:
        solution, solution_style = solution
    else:
        # if style information not provided, fallback to simple accuracy
        solution = solution.reshape(-1)
        prediction = prediction.reshape(-1)
        return (solution == prediction).sum() / solution.shape[0] 
    
    solution = solution.reshape(-1)
    prediction = prediction.reshape(-1)
    categories = np.unique(solution).reshape(-1)
    
    eps = 1e-10
    weights = []
    error_rates = []
    for category in categories:
        for style in categories:
            idx = np.where((solution == category) & (solution_style == style))
            
            sub_solution = solution[idx]
            sub_prediction = prediction[idx]
            
            if category == style:
                weight = 0.05
            else:
                weight = 0.9
            
            if sub_solution.shape[0] == 0:
                accuracy = 1.0
            else:
                accuracy = (sub_solution == sub_prediction).sum() / sub_solution.shape[0]

            weights.append(weight)
            error_rates.append((1 - accuracy)**2)

    return 1 - np.sqrt(np.average(error_rates, weights=weights))