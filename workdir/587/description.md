# Sample Results only Competition

## Overview
# Overview

FAIR-UNIVERSE toy competition is designed for classification purpose. In large hydron colliders, when particles collide, new particles are formed with release of energy. Each collision produces several particles with different sizes and energy. It is important to recognize and classify these particles into categories/classes.

As these experiments are expensive, therefore researchers have created simulators which simulates the real environment and genetare data. 

### Task
The task of the this competition is classificaiton of signal vs background where signal is an event (creation of a particle of interest) and background consists of all other events.

### Installation
In order to run this bundle locally, you need to install the following packages:
- pyyaml
- numpy
- pandas

It is recommended to use virtual environments e.g. conda env

### Credits
- Isabelle Guyon
- David Rousseau
- Ihsan Ullah
- Mathis Reymond

## Evaluation
# Evaluation

Participants are judged based on the performance of their submitted solutions. The metric of evaluation is Area under the ROC Curve (AUC).

To know how AUC works, check this blog post: https://arize.com/blog/what-is-auc

AUC is calcualted using scikit-learn : https://scikit-learn.org/stable/modules/generated/sklearn.metrics.auc.html

## Terms
# Terms and Conditions

In order to participate in FAIR-UNIVERSE competition, all participants have to follow the given terms and conditions.

Note: The organizing team reserves the right to modify/add terms and conditions.

This challenge is for educational purposes only and no prizes are granted. It is governed by the [General ChaLearn Contest Rules](http://www.causality.inf.ethz.ch/GeneralChalearnContestRuleTerms.html)

## Data
# Data

The data used in this competition is generated using two distributions. Each datapoint belongs to either class background (0) or class signal (1).

For simplicity, both distributions are gaussians with known parameters.

### Data Statistics
Train set : 10,000 datapoints (5000 for each class)
Test set : 5,000 datapoints (2500 for each class)
