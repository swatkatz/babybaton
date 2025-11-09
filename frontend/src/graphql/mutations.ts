import { gql } from '@apollo/client';

export const CREATE_FAMILY = gql`
  mutation CreateFamily(
    $familyName: String!
    $password: String!
    $babyName: String!
    $caregiverName: String!
    $deviceId: String!
    $deviceName: String
  ) {
    createFamily(
      familyName: $familyName
      password: $password
      babyName: $babyName
      caregiverName: $caregiverName
      deviceId: $deviceId
      deviceName: $deviceName
    ) {
      success
      error
      family {
        id
        name
        babyName
        createdAt
      }
      caregiver {
        id
        name
        deviceId
        familyId
      }
    }
  }
`;

export const JOIN_FAMILY = gql`
  mutation JoinFamily(
    $familyName: String!
    $password: String!
    $caregiverName: String!
    $deviceId: String!
    $deviceName: String
  ) {
    joinFamily(
      familyName: $familyName
      password: $password
      caregiverName: $caregiverName
      deviceId: $deviceId
      deviceName: $deviceName
    ) {
      success
      error
      family {
        id
        name
        babyName
        createdAt
      }
      caregiver {
        id
        name
        deviceId
        familyId
      }
    }
  }
`;

export const CHECK_FAMILY_NAME_AVAILABLE = gql`
  query CheckFamilyNameAvailable($name: String!) {
    checkFamilyNameAvailable(name: $name)
  }
`;
